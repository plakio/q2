<?php
/**
 * Tasks table persistence gateway.
 *
 * @package Q2
 */

declare( strict_types=1 );

namespace Q2\Tasks;

defined( 'ABSPATH' ) || exit;

/**
 * Provides small, idempotent operations over Q2 task rows.
 */
final class Repository {
	/**
	 * Inserts or updates a task row.
	 *
	 * @param array<string, mixed> $data Task values.
	 */
	public function upsert( array $data ): int {
		global $wpdb;
		$now       = current_time( 'mysql', true );
		$assignees = isset( $data['assignees'] ) ? (array) $data['assignees'] : array();
		$block_id  = isset( $data['block_id'] ) ? (string) $data['block_id'] : '';
		$parent_id = isset( $data['parent_post_id'] ) ? (int) $data['parent_post_id'] : 0;

		if ( '' === $block_id || $parent_id <= 0 ) {
			return 0;
		}

		$existing = (int) $wpdb->get_var(
			$wpdb->prepare(
				// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
				"SELECT id FROM {$wpdb->prefix}q2_tasks WHERE block_id = %s",
				$block_id
			)
		);

		$payload = array(
			'parent_post_id' => $parent_id,
			'actor_user_id'  => isset( $data['actor_user_id'] ) ? (int) $data['actor_user_id'] : 0,
			'title'          => sanitize_text_field( (string) ( $data['title'] ?? '' ) ),
			'status'         => sanitize_key( (string) ( $data['status'] ?? 'todo' ) ),
			'due_date'       => $this->normalize_date( $data['due_date'] ?? null ),
			'assignees'      => wp_json_encode( array_values( array_unique( array_map( 'intval', $assignees ) ) ) ),
			'updated_at'     => $now,
		);

		if ( ! in_array( $payload['status'], array( 'todo', 'in_progress', 'done' ), true ) ) {
			$payload['status'] = 'todo';
		}

		if ( $existing > 0 ) {
			$wpdb->update(
				$wpdb->prefix . 'q2_tasks',
				$payload,
				array( 'id' => $existing ),
				$this->format_upsert(),
				array( '%d' )
			);
			return $existing;
		}

		$payload['block_id']   = $block_id;
		$payload['version']    = 1;
		$payload['created_at'] = $now;

		$wpdb->insert(
			$wpdb->prefix . 'q2_tasks',
			$payload,
			array( '%d', '%d', '%s', '%s', '%s', '%s', '%s', '%s', '%d', '%s' )
		);
		return (int) $wpdb->insert_id;
	}

	/**
	 * Removes a task by stable block ID.
	 *
	 * @param string $block_id Block ID.
	 */
	public function delete_by_block( string $block_id ): void {
		global $wpdb;
		$wpdb->delete(
			$wpdb->prefix . 'q2_tasks',
			array( 'block_id' => $block_id ),
			array( '%s' )
		);
	}

	/**
	 * Removes all task rows for a post.
	 *
	 * @param int $post_id Post ID.
	 */
	public function delete_for_post( int $post_id ): void {
		global $wpdb;
		$wpdb->delete(
			$wpdb->prefix . 'q2_tasks',
			array( 'parent_post_id' => $post_id ),
			array( '%d' )
		);
	}

	/**
	 * Returns the assignees currently stored on a task.
	 *
	 * @param string $block_id Block ID.
	 * @return int[]
	 */
	public function assignees_for_block( string $block_id ): array {
		global $wpdb;
		$row = $wpdb->get_var(
			$wpdb->prepare(
				// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
				"SELECT assignees FROM {$wpdb->prefix}q2_tasks WHERE block_id = %s",
				$block_id
			)
		);
		if ( empty( $row ) ) {
			return array();
		}
		$decoded = json_decode( (string) $row, true );
		if ( ! is_array( $decoded ) ) {
			return array();
		}
		return array_values( array_unique( array_map( 'intval', $decoded ) ) );
	}

	/**
	 * Returns tasks whose due date is at or before a UTC date.
	 *
	 * @param string $cutoff_iso ISO date (YYYY-MM-DD).
	 * @return array<int, object>
	 */
	public function due_on_or_before( string $cutoff_iso ): array {
		global $wpdb;
		// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
		$sql = $wpdb->prepare(
			"SELECT id, block_id, parent_post_id, status, due_date, assignees, title
			FROM {$wpdb->prefix}q2_tasks
			WHERE due_date IS NOT NULL AND due_date <= %s
			ORDER BY due_date ASC",
			$cutoff_iso
		);
		// phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.DirectDatabaseQuery.DirectQuery -- Internal table.
		return is_array( $wpdb->get_results( $sql ) ) ? $wpdb->get_results( $sql ) : array();
	}

	/**
	 * Formats the upsert placeholder list.
	 *
	 * @return string[]
	 */
	private function format_upsert(): array {
		return array( '%d', '%d', '%s', '%s', '%s', '%s', '%s' );
	}

	/**
	 * Normalizes an ISO date or returns null.
	 *
	 * @param mixed $value Raw value.
	 * @return string|null
	 */
	private function normalize_date( $value ): ?string {
		if ( ! is_string( $value ) || '' === trim( $value ) ) {
			return null;
		}
		$time = strtotime( $value );
		if ( false === $time ) {
			return null;
		}
		return gmdate( 'Y-m-d', $time );
	}
}
