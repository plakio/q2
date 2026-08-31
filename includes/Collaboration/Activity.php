<?php
/**
 * Converts WordPress content activity into Q2 collaboration state.
 *
 * @package Q2
 */

declare( strict_types=1 );

namespace Q2\Collaboration;

use Q2\Core\Capabilities;

defined( 'ABSPATH' ) || exit;

/**
 * Indexes mentions and creates durable in-app notifications.
 */
final class Activity {
	/**
	 * Collaboration persistence gateway.
	 *
	 * @var Repository
	 */
	private Repository $repository;

	/**
	 * Creates the activity service.
	 */
	public function __construct() {
		$this->repository = new Repository();
	}

	/**
	 * Registers content lifecycle hooks.
	 */
	public function register(): void {
		add_action( 'save_post_post', array( $this, 'index_post' ), 20, 3 );
		add_action( 'comment_post', array( $this, 'index_new_comment' ), 20, 3 );
		add_action( 'edit_comment', array( $this, 'index_edited_comment' ), 20, 2 );
		add_action( 'transition_comment_status', array( $this, 'index_approved_comment' ), 20, 3 );
		add_action( 'before_delete_post', array( $this->repository, 'delete_post_state' ) );
		add_action( 'delete_comment', array( $this->repository, 'delete_comment_state' ) );
		add_action( 'deleted_user', array( $this->repository, 'delete_user_state' ) );
	}

	/**
	 * Indexes a published post and follows it for its author.
	 *
	 * @param int      $post_id Post ID.
	 * @param \WP_Post $post Current post.
	 * @param bool     $update Whether this is an update.
	 */
	public function index_post( int $post_id, \WP_Post $post, bool $update ): void {
		unset( $update );
		if ( wp_is_post_revision( $post_id ) || 'publish' !== $post->post_status ) {
			return;
		}

		$this->repository->set_following( (int) $post->post_author, $post_id, true );
		$this->repository->mark_read( (int) $post->post_author, 'post', $post_id );
		$this->index_mentions( 'post', $post_id, $post_id, (int) $post->post_author, $post->post_content );
	}

	/**
	 * Processes an approved newly created comment.
	 *
	 * @param int        $comment_id Comment ID.
	 * @param int|string $approved Approval value.
	 * @param array      $comment_data Raw comment data.
	 */
	public function index_new_comment( int $comment_id, int|string $approved, array $comment_data ): void {
		unset( $comment_data );
		if ( 1 === (int) $approved ) {
			$this->process_comment( $comment_id );
		}
	}

	/**
	 * Reindexes an edited approved comment.
	 *
	 * @param int   $comment_id Comment ID.
	 * @param array $data Updated comment data.
	 */
	public function index_edited_comment( int $comment_id, array $data ): void {
		unset( $data );
		$comment = get_comment( $comment_id );
		if ( $comment instanceof \WP_Comment && '1' === $comment->comment_approved ) {
			$this->index_mentions( 'comment', $comment_id, (int) $comment->comment_post_ID, (int) $comment->user_id, $comment->comment_content );
		}
	}

	/**
	 * Processes a comment when moderation approves it.
	 *
	 * @param string      $new_status New status.
	 * @param string      $old_status Previous status.
	 * @param \WP_Comment $comment Comment object.
	 */
	public function index_approved_comment( string $new_status, string $old_status, \WP_Comment $comment ): void {
		if ( 'approved' === $new_status && 'approved' !== $old_status ) {
			$this->process_comment( (int) $comment->comment_ID );
		}
	}

	/**
	 * Indexes comment mentions and notifies thread participants.
	 *
	 * @param int $comment_id Comment ID.
	 */
	private function process_comment( int $comment_id ): void {
		$comment = get_comment( $comment_id );
		if ( ! $comment instanceof \WP_Comment || 0 === (int) $comment->user_id ) {
			return;
		}

		$post_id = (int) $comment->comment_post_ID;
		$actor   = (int) $comment->user_id;
		$this->repository->set_following( $actor, $post_id, true );
		$this->repository->mark_read( $actor, 'post', $post_id );
		$this->index_mentions( 'comment', $comment_id, $post_id, $actor, $comment->comment_content );

		$recipients   = $this->repository->follower_ids( $post_id );
		$recipients[] = (int) get_post_field( 'post_author', $post_id );
		if ( (int) $comment->comment_parent > 0 ) {
			$parent = get_comment( (int) $comment->comment_parent );
			if ( $parent instanceof \WP_Comment ) {
				$recipients[] = (int) $parent->user_id;
			}
		}

		foreach ( array_unique( array_filter( $recipients ) ) as $recipient ) {
			$this->repository->notify(
				array(
					'user_id'               => $recipient,
					'actor_user_id'         => $actor,
					'type'                  => 'comment',
					'object_type'           => 'post',
					'object_id'             => $post_id,
					'secondary_object_type' => 'comment',
					'secondary_object_id'   => $comment_id,
					'dedupe_key'            => 'comment:' . $comment_id . ':' . $recipient,
				)
			);
		}
	}

	/**
	 * Replaces an object's mention index and creates deduplicated notifications.
	 *
	 * @param string $object_type Object type.
	 * @param int    $object_id Object ID.
	 * @param int    $post_id Parent post ID.
	 * @param int    $actor Actor user ID.
	 * @param string $content Serialized content.
	 */
	private function index_mentions( string $object_type, int $object_id, int $post_id, int $actor, string $content ): void {
		global $wpdb;
		$table = $wpdb->prefix . 'q2_mentions';
		$wpdb->delete(
			$table,
			array(
				'object_type' => $object_type,
				'object_id'   => $object_id,
			)
		);

		preg_match_all( '/(?<![\p{L}\p{N}_.-])@([\p{L}\p{N}_.-]+)/u', wp_strip_all_tags( $content ), $matches );
		$keys       = array_unique( array_map( 'strtolower', $matches[1] ?? array() ) );
		$recipients = array();
		foreach ( $keys as $key ) {
			if ( 'all' === $key ) {
				if ( user_can( $actor, Capabilities::MENTION_ALL ) ) {
					$recipients += $this->all_member_mentions();
				}
				continue;
			}

			$user = get_user_by( 'slug', $key );
			if ( false === $user ) {
				$user = get_user_by( 'login', $key );
			}
			if ( $user instanceof \WP_User && is_user_member_of_blog( $user->ID ) ) {
				$recipients[ $user->ID ] = $key;
			}
		}

		foreach ( $recipients as $user_id => $mention_key ) {
			$wpdb->insert(
				$table,
				array(
					'mentioned_user_id' => $user_id,
					'actor_user_id'     => $actor,
					'object_type'       => $object_type,
					'object_id'         => $object_id,
					'parent_post_id'    => $post_id,
					'mention_key'       => $mention_key,
					'created_at'        => current_time( 'mysql', true ),
				),
				array( '%d', '%d', '%s', '%d', '%d', '%s', '%s' )
			);
			$this->repository->notify(
				array(
					'user_id'       => $user_id,
					'actor_user_id' => $actor,
					'type'          => 'mention',
					'object_type'   => 'post',
					'object_id'     => $post_id,
					'dedupe_key'    => 'mention:' . $object_type . ':' . $object_id . ':' . $user_id,
				)
			);
		}
	}

	/**
	 * Returns all site members keyed to the special mention.
	 *
	 * @return array<int, string>
	 */
	private function all_member_mentions(): array {
		$result = array();
		foreach ( get_users(
			array(
				'blog_id' => get_current_blog_id(),
				'fields'  => 'ID',
			)
		) as $user_id ) {
			$result[ (int) $user_id ] = 'all';
		}
		return $result;
	}
}
