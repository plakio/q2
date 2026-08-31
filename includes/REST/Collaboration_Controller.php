<?php
/**
 * Collaboration REST resources.
 *
 * @package Q2
 */

declare( strict_types=1 );

namespace Q2\REST;

use Q2\Collaboration\Repository;

defined( 'ABSPATH' ) || exit;

/**
 * Exposes collaboration state without wrapping native post records.
 */
final class Collaboration_Controller {
	/**
	 * Collaboration persistence gateway.
	 *
	 * @var Repository
	 */
	private Repository $repository;

	/**
	 * Creates the controller.
	 */
	public function __construct() {
		$this->repository = new Repository();
	}

	/**
	 * Hooks REST registration.
	 */
	public function register(): void {
		add_action( 'rest_api_init', array( $this, 'register_routes' ) );
	}

	/**
	 * Registers collaboration routes.
	 */
	public function register_routes(): void {
		register_rest_route(
			'q2/v1',
			'/collaboration/posts/(?P<id>\d+)',
			array(
				array(
					'methods'             => 'GET',
					'callback'            => array( $this, 'get_post_state' ),
					'permission_callback' => array( $this, 'can_read_post' ),
				),
				array(
					'methods'             => 'POST',
					'callback'            => array( $this, 'update_post_state' ),
					'permission_callback' => array( $this, 'can_read_post' ),
				),
			)
		);
		register_rest_route(
			'q2/v1',
			'/collaboration/feed',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'get_feed_state' ),
				'permission_callback' => static fn(): bool => current_user_can( 'read' ),
			)
		);
		register_rest_route(
			'q2/v1',
			'/notifications',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'get_notifications' ),
				'permission_callback' => static fn(): bool => current_user_can( 'read' ),
			)
		);
		register_rest_route(
			'q2/v1',
			'/notifications/read',
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'mark_notifications_read' ),
				'permission_callback' => static fn(): bool => current_user_can( 'read' ),
			)
		);
		register_rest_route(
			'q2/v1',
			'/preferences/feed-view',
			array(
				array(
					'methods'             => 'GET',
					'callback'            => array( $this, 'get_feed_view' ),
					'permission_callback' => static fn(): bool => current_user_can( 'read' ),
				),
				array(
					'methods'             => 'POST',
					'callback'            => array( $this, 'update_feed_view' ),
					'permission_callback' => static fn(): bool => current_user_can( 'read' ),
				),
			)
		);
	}

	/**
	 * Checks post visibility.
	 *
	 * @param \WP_REST_Request $request Current request.
	 */
	public function can_read_post( \WP_REST_Request $request ): bool {
		return current_user_can( 'read_post', absint( $request->get_param( 'id' ) ) );
	}

	/**
	 * Returns follow, Like, and read state for a post.
	 *
	 * @param \WP_REST_Request $request Current request.
	 */
	public function get_post_state( \WP_REST_Request $request ): \WP_REST_Response {
		return rest_ensure_response(
			$this->repository->post_state( get_current_user_id(), absint( $request->get_param( 'id' ) ) )
		);
	}

	/**
	 * Applies an idempotent collaboration action to a post.
	 *
	 * @param \WP_REST_Request $request Current request.
	 */
	public function update_post_state( \WP_REST_Request $request ): \WP_REST_Response|\WP_Error {
		$post_id = absint( $request->get_param( 'id' ) );
		$user_id = get_current_user_id();
		$action  = sanitize_key( (string) $request->get_param( 'action' ) );
		$enabled = rest_sanitize_boolean( $request->get_param( 'enabled' ) );

		if ( 'follow' === $action ) {
			$this->repository->set_following( $user_id, $post_id, $enabled );
		} elseif ( 'like' === $action ) {
			$this->repository->set_liked( $user_id, $post_id, $enabled );
			if ( $enabled ) {
				$author = (int) get_post_field( 'post_author', $post_id );
				$this->repository->notify(
					array(
						'user_id'       => $author,
						'actor_user_id' => $user_id,
						'type'          => 'like',
						'object_type'   => 'post',
						'object_id'     => $post_id,
						'dedupe_key'    => 'like:' . $post_id . ':' . $user_id,
					)
				);
			}
		} elseif ( 'read' === $action ) {
			$this->repository->mark_read( $user_id, 'post', $post_id );
		} else {
			return new \WP_Error( 'q2_invalid_collaboration_action', __( 'That collaboration action is not supported.', 'q2' ), array( 'status' => 400 ) );
		}

		return $this->get_post_state( $request );
	}

	/**
	 * Returns recipient-specific IDs used by feed filters.
	 */
	public function get_feed_state(): \WP_REST_Response {
		$user_id           = get_current_user_id();
		$read_ids          = $this->repository->read_post_ids( $user_id );
		$posts             = get_posts(
			array(
				'post_type'      => 'post',
				'post_status'    => 'publish',
				'posts_per_page' => 100,
				'fields'         => 'ids',
			)
		);
		$new_posts         = array_values( array_diff( array_map( 'intval', $posts ), $read_ids ) );
		$new_comment_posts = $this->new_comment_post_ids( $user_id );

		return rest_ensure_response(
			array(
				'newPostIds'        => $new_posts,
				'newCommentPostIds' => $new_comment_posts,
				'mentionPostIds'    => $this->repository->mentioned_post_ids( $user_id ),
			)
		);
	}

	/**
	 * Returns the current user's notifications.
	 *
	 * @param \WP_REST_Request $request Current request.
	 */
	public function get_notifications( \WP_REST_Request $request ): \WP_REST_Response {
		$rows = $this->repository->notifications( get_current_user_id(), rest_sanitize_boolean( $request->get_param( 'unread' ) ) );
		return rest_ensure_response(
			array_map(
				static function ( object $row ): array {
					$actor = get_userdata( (int) $row->actor_user_id );
					return array(
						'id'        => (int) $row->id,
						'type'      => $row->type,
						'objectId'  => (int) $row->object_id,
						'actorName' => $actor ? $actor->display_name : __( 'A former member', 'q2' ),
						'avatarUrl' => get_avatar_url( (int) $row->actor_user_id, array( 'size' => 64 ) ),
						'createdAt' => mysql_to_rfc3339( $row->created_at ),
						'read'      => null !== $row->read_at,
					);
				},
				$rows
			)
		);
	}

	/**
	 * Marks one or all notifications read for the current user.
	 *
	 * @param \WP_REST_Request $request Current request.
	 */
	public function mark_notifications_read( \WP_REST_Request $request ): \WP_REST_Response {
		$this->repository->mark_notifications_read( get_current_user_id(), absint( $request->get_param( 'id' ) ) );
		return rest_ensure_response( array( 'updated' => true ) );
	}

	/**
	 * Returns the persisted feed presentation preference.
	 */
	public function get_feed_view(): \WP_REST_Response {
		$view = get_user_meta( get_current_user_id(), 'q2_feed_view', true );
		return rest_ensure_response( array( 'view' => in_array( $view, array( 'default', 'expanded', 'compact' ), true ) ? $view : 'default' ) );
	}

	/**
	 * Persists a supported feed presentation preference.
	 *
	 * @param \WP_REST_Request $request Current request.
	 */
	public function update_feed_view( \WP_REST_Request $request ): \WP_REST_Response|\WP_Error {
		$view = sanitize_key( (string) $request->get_param( 'view' ) );
		if ( ! in_array( $view, array( 'default', 'expanded', 'compact' ), true ) ) {
			return new \WP_Error( 'q2_invalid_feed_view', __( 'That feed view is not supported.', 'q2' ), array( 'status' => 400 ) );
		}
		update_user_meta( get_current_user_id(), 'q2_feed_view', $view );
		return rest_ensure_response( array( 'view' => $view ) );
	}

	/**
	 * Finds posts with approved comments newer than the user's read marker.
	 *
	 * @param int $user_id Current user ID.
	 * @return int[]
	 */
	private function new_comment_post_ids( int $user_id ): array {
		$comments = get_comments(
			array(
				'status'  => 'approve',
				'number'  => 500,
				'orderby' => 'comment_date_gmt',
				'order'   => 'DESC',
			)
		);
		$read     = $this->repository->read_post_times( $user_id );
		$result   = array();
		foreach ( $comments as $comment ) {
			$post_id = (int) $comment->comment_post_ID;
			$is_new  = ! isset( $read[ $post_id ] ) || $comment->comment_date_gmt > $read[ $post_id ];
			if ( $is_new && current_user_can( 'read_post', $post_id ) ) {
				$result[] = $post_id;
			}
		}
		return array_values( array_unique( $result ) );
	}
}
