<?php
/**
 * Reconciles Q2 task blocks with the tasks table and notifications.
 *
 * @package Q2
 */

declare( strict_types=1 );

namespace Q2\Tasks;

use Q2\Collaboration\Repository;

defined( 'ABSPATH' ) || exit;

/**
 * Maintains task persistence as posts save; emits assignment notifications.
 */
final class Sync {
	/**
	 * Tasks persistence gateway.
	 *
	 * @var Repository
	 */
	private Repository $tasks;

	/**
	 * Collaboration persistence gateway.
	 *
	 * @var Repository
	 */
	private Repository $collaboration;

	/**
	 * Creates the sync service.
	 */
	public function __construct() {
		$this->tasks         = new Repository();
		$this->collaboration = new Repository();
	}

	/**
	 * Hooks content lifecycle.
	 */
	public function register(): void {
		add_action( 'save_post_post', array( $this, 'on_save_post' ), 25, 3 );
		add_action( 'save_post_page', array( $this, 'on_save_post' ), 25, 3 );
		add_action( 'before_delete_post', array( $this, 'on_delete_post' ) );
	}

	/**
	 * Reconciles tasks stored in a post on save and emits notifications.
	 *
	 * @param int      $post_id Post ID.
	 * @param \WP_Post $post Post object.
	 * @param bool     $update Whether update.
	 */
	public function on_save_post( int $post_id, \WP_Post $post, bool $update ): void {
		unset( $update );
		if ( wp_is_post_revision( $post_id ) ) {
			return;
		}

		$content = (string) $post->post_content;
		$parsed  = parse_blocks( $content );

		$present_ids  = array();
		$parsed_tasks = $this->collect_tasks( $parsed, $post_id, (int) $post->post_author );

		foreach ( $parsed_tasks as $task ) {
			$block_id      = (string) $task['blockId'];
			$present_ids[] = $block_id;

			$existing_assignees = $this->tasks->assignees_for_block( $block_id );
			$new_assignees      = array_diff( $task['assignees'], $existing_assignees );

			$this->tasks->upsert(
				array(
					'block_id'       => $block_id,
					'parent_post_id' => $post_id,
					'actor_user_id'  => (int) $post->post_author,
					'title'          => $task['title'],
					'status'         => $task['status'],
					'due_date'       => $task['dueDate'],
					'assignees'      => $task['assignees'],
				)
			);

			// Wake the daily cron so newly added/rescheduled tasks surface today.
			if ( ! empty( $task['dueDate'] ) ) {
				do_action( 'q2_tasks_due_changed' );
			}

			foreach ( $new_assignees as $assignee ) {
				$this->collaboration->notify(
					array(
						'user_id'       => (int) $assignee,
						'actor_user_id' => (int) $post->post_author,
						'type'          => 'task_assigned',
						'object_type'   => 'post',
						'object_id'     => $post_id,
						'payload'       => array(
							'block_id' => $block_id,
							'title'    => $task['title'],
							'due_date' => $task['dueDate'],
						),
						'dedupe_key'    => 'task_assigned:' . $block_id . ':' . (int) $assignee,
					)
				);
			}
		}

		$this->prune_missing( $post_id, $present_ids );
	}

	/**
	 * Removes orphaned task rows for a post when blocks are removed.
	 *
	 * @param int   $post_id Post ID.
	 * @param int[] $present_ids Block IDs present in saved content.
	 */
	private function prune_missing( int $post_id, array $present_ids ): void {
		global $wpdb;
		$table = $wpdb->prefix . 'q2_tasks';
		if ( empty( $present_ids ) ) {
			$wpdb->delete( $table, array( 'parent_post_id' => $post_id ), array( '%d' ) );
			return;
		}
		$placeholders = implode( ',', array_fill( 0, count( $present_ids ), '%s' ) );
		$prepared     = array_merge( array( $post_id ), $present_ids );
		// phpcs:disable WordPress.DB.PreparedSQL.InterpolatedNotPrepared, WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.PreparedSQL.NonPreparedGroupedRules
		$delete_sql = $wpdb->prepare(
			"DELETE FROM {$table} WHERE parent_post_id = %d AND block_id NOT IN ($placeholders)",
			$prepared
		);
		// phpcs:enable
		// phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared -- Variable holds a prepared SQL string.
		$wpdb->query( $delete_sql );
	}

	/**
	 * Removes tasks when the post itself is deleted.
	 *
	 * @param int $post_id Post ID.
	 */
	public function on_delete_post( int $post_id ): void {
		$this->tasks->delete_for_post( $post_id );
	}

	/**
	 * Collects Q2 task blocks recursively.
	 *
	 * @param array<int, array<string, mixed>> $blocks Parsed blocks.
	 * @param int                              $post_id Post ID (unused, fallback).
	 * @param int                              $actor Default actor.
	 * @return array<int, array<string, mixed>>
	 */
	private function collect_tasks( array $blocks, int $post_id, int $actor ): array {
		$tasks = array();
		foreach ( $blocks as $block ) {
			$name = (string) ( $block['blockName'] ?? '' );
			if ( 'q2/task' === $name ) {
				$attrs    = (array) ( $block['attrs'] ?? array() );
				$block_id = isset( $attrs['blockId'] ) ? (string) $attrs['blockId'] : '';
				if ( '' === $block_id ) {
					continue;
				}
				$tasks[] = array(
					'blockId'   => $block_id,
					'title'     => (string) ( $attrs['title'] ?? __( 'Untitled task', 'q2' ) ),
					'status'    => sanitize_key( (string) ( $attrs['status'] ?? 'todo' ) ),
					'dueDate'   => isset( $attrs['dueDate'] ) ? (string) $attrs['dueDate'] : '',
					'assignees' => array_values( array_map( 'intval', (array) ( $attrs['assignees'] ?? array() ) ) ),
				);
			}
			$inner = isset( $block['innerBlocks'] ) && is_array( $block['innerBlocks'] ) ? $block['innerBlocks'] : array();
			if ( ! empty( $inner ) ) {
				$tasks = array_merge( $tasks, $this->collect_tasks( $inner, $post_id, $actor ) );
			}
		}
		return $tasks;
	}
}
