<?php
/**
 * Tasks REST controller.
 *
 * @package Q2
 */

declare( strict_types=1 );

namespace Q2\REST;

use Q2\Tasks\Repository;

defined( 'ABSPATH' ) || exit;

/**
 * Exposes task reads/writes for the Q2 client.
 *
 * Routes:
 *  - GET /tasks                           — list tasks filtered by scope
 *  - GET /posts/(?P<id>\d+)/tasks         — summary for tasks embedded in one post
 */
final class Tasks_Controller {
	/**
	 * Tasks persistence gateway.
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
	 * Registers task routes.
	 */
	public function register_routes(): void {
		register_rest_route(
			'q2/v1',
			'/tasks',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'get_tasks' ),
				'permission_callback' => static fn(): bool => current_user_can( 'read' ),
				'args'                => array(
					'scope'   => array(
						'type'              => 'string',
						'default'           => 'all',
						'sanitize_callback' => 'sanitize_key',
					),
					'overdue' => array(
						'type'              => 'string',
						'sanitize_callback' => 'sanitize_text_field',
					),
					'perPage' => array(
						'type'              => 'integer',
						'default'           => 30,
						'sanitize_callback' => 'absint',
					),
					'page'    => array(
						'type'              => 'integer',
						'default'           => 1,
						'sanitize_callback' => 'absint',
					),
				),
			)
		);
		register_rest_route(
			'q2/v1',
			'/posts/(?P<id>\d+)/tasks',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'get_post_tasks' ),
				'permission_callback' => static function ( \WP_REST_Request $request ): bool {
					return current_user_can( 'read_post', absint( $request->get_param( 'id' ) ) );
				},
			)
		);
	}

	/**
	 * Returns a list of tasks visible to the current user.
	 *
	 * @param \WP_REST_Request $request Current request.
	 */
	public function get_tasks( \WP_REST_Request $request ): \WP_REST_Response {
		$scope    = (string) $request->get_param( 'scope' );
		$overdue  = trim( (string) $request->get_param( 'overdue' ) );
		$per_page = max( 1, min( 100, (int) $request->get_param( 'perPage' ) ) );
		$page     = max( 1, (int) $request->get_param( 'page' ) );

		global $wpdb;
		$table  = $wpdb->prefix . 'q2_tasks';
		$offset = ( $page - 1 ) * $per_page;

		$items = $this->query_task_rows( $table, $scope, $overdue, $per_page, $offset );
		$total = $this->count_task_rows( $table, $scope, $overdue );

		return rest_ensure_response(
			array(
				'items'      => array_values(
					array_filter(
						array_map( array( $this, 'prepare_task' ), $items )
					)
				),
				'total'      => $total,
				'totalPages' => (int) ceil( max( $total, 1 ) / $per_page ),
			)
		);
	}

	/**
	 * Returns task summary for a specific post.
	 *
	 * @param \WP_REST_Request $request Current request.
	 */
	public function get_post_tasks( \WP_REST_Request $request ): \WP_REST_Response {
		global $wpdb;
		$table   = $wpdb->prefix . 'q2_tasks';
		$post_id = absint( $request->get_param( 'id' ) );

		$sql = $wpdb->prepare(
			// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
			"SELECT id, block_id, parent_post_id, title, status, due_date, assignees FROM {$table} WHERE parent_post_id = %d",
			$post_id
		);
		// phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared, WordPress.DB.DirectDatabaseQuery.DirectQuery
		$rows = is_array( $wpdb->get_results( $sql ) ) ? $wpdb->get_results( $sql ) : array();

		return rest_ensure_response(
			array_map( array( $this, 'prepare_task' ), $rows )
		);
	}

	/**
	 * Builds a normalized task payload.
	 *
	 * @param object $row Database row.
	 * @return array<string, mixed>
	 */
	private function prepare_task( object $row ): array {
		$post_id = (int) $row->parent_post_id;
		if ( ! current_user_can( 'read_post', $post_id ) ) {
			return array();
		}
		$assignees = array();
		if ( ! empty( $row->assignees ) ) {
			$decoded = json_decode( (string) $row->assignees, true );
			if ( is_array( $decoded ) ) {
				foreach ( $decoded as $user_id ) {
					$user = get_userdata( (int) $user_id );
					if ( $user ) {
						$assignees[] = array(
							'id'        => $user->ID,
							'name'      => $user->display_name,
							'slug'      => $user->user_nicename,
							'avatarUrl' => get_avatar_url( $user->ID, array( 'size' => 64 ) ),
						);
					}
				}
			}
		}

		return array(
			'id'        => (int) $row->id,
			'blockId'   => (string) $row->block_id,
			'postId'    => $post_id,
			'postTitle' => get_the_title( $post_id ),
			'title'     => (string) $row->title,
			'status'    => (string) $row->status,
			'dueDate'   => $row->due_date ? (string) $row->due_date : null,
			'assignees' => $assignees,
		);
	}

	/**
	 * Queries task rows respecting scope/overdue/pagination.
	 *
	 * @param string $table Table name.
	 * @param string $scope Scope filter.
	 * @param string $overdue Optional overdue ISO date.
	 * @param int    $per_page Pagination limit.
	 * @param int    $offset Pagination offset.
	 * @return array<int, object>
	 */
	private function query_task_rows( string $table, string $scope, string $overdue, int $per_page, int $offset ): array {
		global $wpdb;
		$user_id_safe = (int) get_current_user_id();
		$overdue_safe = $overdue;

		// phpcs:disable WordPress.DB.PreparedSQL.InterpolatedNotPrepared
		if ( 'mine' === $scope ) {
			$rows = $wpdb->get_results(
				$wpdb->prepare(
					"SELECT id, block_id, parent_post_id, title, status, due_date, assignees FROM {$table} WHERE JSON_CONTAINS(assignees, %d) OR actor_user_id = %d ORDER BY CASE WHEN due_date IS NULL THEN 1 ELSE 0 END, due_date ASC, updated_at DESC LIMIT %d OFFSET %d",
					array( $user_id_safe, $user_id_safe, $per_page, $offset )
				)
			);
			return is_array( $rows ) ? $rows : array();
		}

		if ( '' !== $overdue ) {
			$rows = $wpdb->get_results(
				$wpdb->prepare(
					"SELECT id, block_id, parent_post_id, title, status, due_date, assignees FROM {$table} WHERE due_date IS NOT NULL AND due_date <= %s AND status <> %s ORDER BY CASE WHEN due_date IS NULL THEN 1 ELSE 0 END, due_date ASC, updated_at DESC LIMIT %d OFFSET %d",
					array( $overdue_safe, 'done', $per_page, $offset )
				)
			);
			return is_array( $rows ) ? $rows : array();
		}

		$rows = $wpdb->get_results(
			$wpdb->prepare(
				"SELECT id, block_id, parent_post_id, title, status, due_date, assignees FROM {$table} ORDER BY CASE WHEN due_date IS NULL THEN 1 ELSE 0 END, due_date ASC, updated_at DESC LIMIT %d OFFSET %d",
				array( $per_page, $offset )
			)
		);
		// phpcs:enable
		return is_array( $rows ) ? $rows : array();
	}

	/**
	 * Counts task rows respecting scope/overdue.
	 *
	 * @param string $table Table name.
	 * @param string $scope Scope filter.
	 * @param string $overdue Optional overdue ISO date.
	 * @return int
	 */
	private function count_task_rows( string $table, string $scope, string $overdue ): int {
		global $wpdb;
		$user_id_safe = (int) get_current_user_id();
		$overdue_safe = $overdue;

		// phpcs:disable WordPress.DB.PreparedSQL.InterpolatedNotPrepared
		if ( 'mine' === $scope ) {
			return (int) $wpdb->get_var(
				$wpdb->prepare(
					"SELECT COUNT(*) FROM {$table} WHERE JSON_CONTAINS(assignees, %d) OR actor_user_id = %d",
					array( $user_id_safe, $user_id_safe )
				)
			);
		}
		if ( '' !== $overdue ) {
			return (int) $wpdb->get_var(
				$wpdb->prepare(
					"SELECT COUNT(*) FROM {$table} WHERE due_date IS NOT NULL AND due_date <= %s AND status <> %s",
					array( $overdue_safe, 'done' )
				)
			);
		}
		// phpcs:enable

		return (int) $wpdb->get_var( "SELECT COUNT(*) FROM {$table}" ); // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared, WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.PreparedSQL.NotPrepared
	}
}
