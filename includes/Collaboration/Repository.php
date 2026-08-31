<?php
/**
 * Persistence gateway for Q2 collaboration state.
 *
 * @package Q2
 */

declare( strict_types=1 );

namespace Q2\Collaboration;

defined( 'ABSPATH' ) || exit;

/**
 * Provides small, idempotent operations over Q2 collaboration tables.
 */
final class Repository {
	/**
	 * Inserts a deduplicated notification.
	 *
	 * @param array<string, mixed> $data Notification values.
	 */
	public function notify( array $data ): void {
		global $wpdb;
		if ( (int) $data['user_id'] === (int) $data['actor_user_id'] ) {
			return;
		}

		$inserted = $wpdb->insert(
			$this->table( 'notifications' ),
			array(
				'user_id'               => (int) $data['user_id'],
				'actor_user_id'         => (int) $data['actor_user_id'],
				'type'                  => sanitize_key( (string) $data['type'] ),
				'object_type'           => sanitize_key( (string) $data['object_type'] ),
				'object_id'             => (int) $data['object_id'],
				'secondary_object_type' => sanitize_key( (string) ( $data['secondary_object_type'] ?? '' ) ),
				'secondary_object_id'   => (int) ( $data['secondary_object_id'] ?? 0 ),
				'payload'               => wp_json_encode( $data['payload'] ?? array() ),
				'dedupe_key'            => sanitize_text_field( (string) $data['dedupe_key'] ),
				'created_at'            => current_time( 'mysql', true ),
				'read_at'               => null,
			),
			array( '%d', '%d', '%s', '%s', '%d', '%s', '%d', '%s', '%s', '%s', '%s' )
		);

		if ( false !== $inserted ) {
			do_action( 'q2_notification_created', $data );
		}
	}

	/**
	 * Lists notification rows for a recipient.
	 *
	 * @param int  $user_id Recipient user ID.
	 * @param bool $unread_only Whether only unread rows are requested.
	 * @return array<int, object>
	 */
	public function notifications( int $user_id, bool $unread_only = false ): array {
		global $wpdb;
		$table  = $this->table( 'notifications' );
		$unread = $unread_only ? ' AND read_at IS NULL' : '';
		// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Table is generated internally.
		$sql = $wpdb->prepare( "SELECT * FROM {$table} WHERE user_id = %d{$unread} ORDER BY created_at DESC, id DESC LIMIT 100", $user_id );
		// phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.DirectDatabaseQuery.DirectQuery -- Dedicated indexed table.
		return $wpdb->get_results( $sql );
	}

	/**
	 * Marks one notification, or all notifications, as read.
	 *
	 * @param int $user_id Recipient user ID.
	 * @param int $notification_id Optional notification ID.
	 */
	public function mark_notifications_read( int $user_id, int $notification_id = 0 ): void {
		global $wpdb;
		$where = array( 'user_id' => $user_id );
		if ( $notification_id > 0 ) {
			$where['id'] = $notification_id;
		}
		$wpdb->update(
			$this->table( 'notifications' ),
			array( 'read_at' => current_time( 'mysql', true ) ),
			$where
		);
	}

	/**
	 * Stores a per-object read marker.
	 *
	 * @param int    $user_id User ID.
	 * @param string $object_type Object type.
	 * @param int    $object_id Object ID.
	 */
	public function mark_read( int $user_id, string $object_type, int $object_id ): void {
		global $wpdb;
		$wpdb->replace(
			$this->table( 'reads' ),
			array(
				'user_id'            => $user_id,
				'object_type'        => $object_type,
				'object_id'          => $object_id,
				'last_seen_event_id' => 0,
				'read_at'            => current_time( 'mysql', true ),
			),
			array( '%d', '%s', '%d', '%d', '%s' )
		);
	}

	/**
	 * Returns post IDs explicitly marked read by a user.
	 *
	 * @param int $user_id User ID.
	 * @return int[]
	 */
	public function read_post_ids( int $user_id ): array {
		global $wpdb;
		$table = $this->table( 'reads' );
		// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Table is generated internally.
		$sql = $wpdb->prepare( "SELECT object_id FROM {$table} WHERE user_id = %d AND object_type = 'post'", $user_id );
		// phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.DirectDatabaseQuery.DirectQuery -- Dedicated indexed table.
		return array_map( 'intval', $wpdb->get_col( $sql ) );
	}

	/**
	 * Returns post read timestamps keyed by post ID.
	 *
	 * @param int $user_id User ID.
	 * @return array<int, string>
	 */
	public function read_post_times( int $user_id ): array {
		global $wpdb;
		$table = $this->table( 'reads' );
		// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Table is generated internally.
		$sql = $wpdb->prepare( "SELECT object_id, read_at FROM {$table} WHERE user_id = %d AND object_type = 'post'", $user_id );
		// phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.DirectDatabaseQuery.DirectQuery -- Dedicated indexed table.
		$rows   = $wpdb->get_results( $sql );
		$result = array();
		foreach ( $rows as $row ) {
			$result[ (int) $row->object_id ] = (string) $row->read_at;
		}
		return $result;
	}

	/**
	 * Sets or removes a follow relationship.
	 *
	 * @param int  $user_id User ID.
	 * @param int  $post_id Post ID.
	 * @param bool $following Desired state.
	 */
	public function set_following( int $user_id, int $post_id, bool $following ): void {
		global $wpdb;
		$table = $this->table( 'follows' );
		if ( $following ) {
			$wpdb->replace(
				$table,
				array(
					'user_id'     => $user_id,
					'object_type' => 'post',
					'object_id'   => $post_id,
					'created_at'  => current_time( 'mysql', true ),
				),
				array( '%d', '%s', '%d', '%s' )
			);
			return;
		}

		$wpdb->delete(
			$table,
			array(
				'user_id'     => $user_id,
				'object_type' => 'post',
				'object_id'   => $post_id,
			)
		);
	}

	/**
	 * Returns follower IDs for a post.
	 *
	 * @param int $post_id Post ID.
	 * @return int[]
	 */
	public function follower_ids( int $post_id ): array {
		global $wpdb;
		$table = $this->table( 'follows' );
		// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Table is generated internally.
		$sql = $wpdb->prepare( "SELECT user_id FROM {$table} WHERE object_type = 'post' AND object_id = %d", $post_id );
		// phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.DirectDatabaseQuery.DirectQuery -- Dedicated indexed table.
		return array_map( 'intval', $wpdb->get_col( $sql ) );
	}

	/**
	 * Sets or removes the Like reaction.
	 *
	 * @param int  $user_id User ID.
	 * @param int  $post_id Post ID.
	 * @param bool $liked Desired state.
	 */
	public function set_liked( int $user_id, int $post_id, bool $liked ): void {
		global $wpdb;
		$table = $this->table( 'reactions' );
		if ( $liked ) {
			$wpdb->replace(
				$table,
				array(
					'user_id'     => $user_id,
					'object_type' => 'post',
					'object_id'   => $post_id,
					'reaction'    => 'like',
					'created_at'  => current_time( 'mysql', true ),
				),
				array( '%d', '%s', '%d', '%s', '%s' )
			);
			return;
		}

		$wpdb->delete(
			$table,
			array(
				'user_id'     => $user_id,
				'object_type' => 'post',
				'object_id'   => $post_id,
				'reaction'    => 'like',
			)
		);
	}

	/**
	 * Gets collaboration state for one post and user.
	 *
	 * @param int $user_id User ID.
	 * @param int $post_id Post ID.
	 * @return array<string, int|bool>
	 */
	public function post_state( int $user_id, int $post_id ): array {
		global $wpdb;
		$follows   = $this->table( 'follows' );
		$reactions = $this->table( 'reactions' );
		$reads     = $this->table( 'reads' );
		// phpcs:disable WordPress.DB.PreparedSQL.InterpolatedNotPrepared, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.DirectDatabaseQuery.DirectQuery -- Internal table names and indexed point queries.
		$following = (bool) $wpdb->get_var( $wpdb->prepare( "SELECT 1 FROM {$follows} WHERE user_id = %d AND object_type = 'post' AND object_id = %d", $user_id, $post_id ) );
		$liked     = (bool) $wpdb->get_var( $wpdb->prepare( "SELECT 1 FROM {$reactions} WHERE user_id = %d AND object_type = 'post' AND object_id = %d AND reaction = 'like'", $user_id, $post_id ) );
		$likes     = (int) $wpdb->get_var( $wpdb->prepare( "SELECT COUNT(*) FROM {$reactions} WHERE object_type = 'post' AND object_id = %d AND reaction = 'like'", $post_id ) );
		$read_at   = (string) $wpdb->get_var( $wpdb->prepare( "SELECT read_at FROM {$reads} WHERE user_id = %d AND object_type = 'post' AND object_id = %d", $user_id, $post_id ) );
		// phpcs:enable
		$post          = get_post( $post_id );
		$last_activity = $post instanceof \WP_Post ? $post->post_date_gmt : '';
		$comments      = get_comments(
			array(
				'post_id' => $post_id,
				'status'  => 'approve',
				'number'  => 1,
				'orderby' => 'comment_date_gmt',
				'order'   => 'DESC',
			)
		);
		if ( isset( $comments[0] ) && $comments[0]->comment_date_gmt > $last_activity ) {
			$last_activity = $comments[0]->comment_date_gmt;
		}
		$read = '' !== $read_at && $read_at >= $last_activity;

		return compact( 'following', 'liked', 'likes', 'read' );
	}

	/**
	 * Returns post IDs that mention a user.
	 *
	 * @param int $user_id User ID.
	 * @return int[]
	 */
	public function mentioned_post_ids( int $user_id ): array {
		global $wpdb;
		$table = $this->table( 'mentions' );
		// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Table is generated internally.
		$sql = $wpdb->prepare( "SELECT DISTINCT parent_post_id FROM {$table} WHERE mentioned_user_id = %d ORDER BY created_at DESC", $user_id );
		// phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.DirectDatabaseQuery.DirectQuery -- Dedicated indexed table.
		return array_map( 'intval', $wpdb->get_col( $sql ) );
	}

	/**
	 * Removes collaboration state owned by a deleted post.
	 *
	 * @param int $post_id Deleted post ID.
	 */
	public function delete_post_state( int $post_id ): void {
		global $wpdb;
		$wpdb->delete(
			$this->table( 'reads' ),
			array(
				'object_type' => 'post',
				'object_id'   => $post_id,
			)
		);
		$wpdb->delete(
			$this->table( 'follows' ),
			array(
				'object_type' => 'post',
				'object_id'   => $post_id,
			)
		);
		$wpdb->delete(
			$this->table( 'reactions' ),
			array(
				'object_type' => 'post',
				'object_id'   => $post_id,
			)
		);
		$wpdb->delete( $this->table( 'mentions' ), array( 'parent_post_id' => $post_id ) );
		$wpdb->delete(
			$this->table( 'notifications' ),
			array(
				'object_type' => 'post',
				'object_id'   => $post_id,
			)
		);
	}

	/**
	 * Removes collaboration state owned by a deleted comment.
	 *
	 * @param int $comment_id Deleted comment ID.
	 */
	public function delete_comment_state( int $comment_id ): void {
		global $wpdb;
		$wpdb->delete(
			$this->table( 'mentions' ),
			array(
				'object_type' => 'comment',
				'object_id'   => $comment_id,
			)
		);
		$wpdb->delete(
			$this->table( 'notifications' ),
			array(
				'secondary_object_type' => 'comment',
				'secondary_object_id'   => $comment_id,
			)
		);
	}

	/**
	 * Removes recipient relationship state for a deleted user.
	 *
	 * @param int $user_id Deleted user ID.
	 */
	public function delete_user_state( int $user_id ): void {
		global $wpdb;
		foreach ( array( 'reads', 'follows', 'reactions' ) as $table ) {
			$wpdb->delete( $this->table( $table ), array( 'user_id' => $user_id ) );
		}
		$wpdb->delete( $this->table( 'mentions' ), array( 'mentioned_user_id' => $user_id ) );
		$wpdb->delete( $this->table( 'notifications' ), array( 'user_id' => $user_id ) );
	}

	/**
	 * Returns a prefixed Q2 table name.
	 *
	 * @param string $name Unprefixed table suffix.
	 */
	private function table( string $name ): string {
		global $wpdb;
		return $wpdb->prefix . 'q2_' . $name;
	}
}
