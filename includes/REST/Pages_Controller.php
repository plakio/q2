<?php
/**
 * Q2 Pages REST controller.
 *
 * @package Q2
 */

declare( strict_types=1 );

namespace Q2\REST;

defined( 'ABSPATH' ) || exit;

/**
 * Provides Pages screen CRUD over native WordPress pages.
 *
 * Routes:
 *  - GET    /pages                      — hierarchical tree of pages
 *  - POST   /pages                      — create a page
 *  - GET    /pages/(?P<id>\d+)          — read a single page with rendered content
 *  - PATCH  /pages/(?P<id>\d+)          — update a page
 *  - DELETE /pages/(?P<id>\d+)          — trash a page
 */
final class Pages_Controller {
	/**
	 * Hooks REST route registration.
	 */
	public function register(): void {
		add_action( 'rest_api_init', array( $this, 'register_routes' ) );
	}

	/**
	 * Registers Pages routes.
	 */
	public function register_routes(): void {
		register_rest_route(
			'q2/v1',
			'/pages',
			array(
				array(
					'methods'             => 'GET',
					'callback'            => array( $this, 'index_pages' ),
					'permission_callback' => static fn(): bool => current_user_can( 'read' ),
					'args'                => array(
						'search' => array(
							'type'              => 'string',
							'sanitize_callback' => 'sanitize_text_field',
						),
					),
				),
				array(
					'methods'             => 'POST',
					'callback'            => array( $this, 'create_page' ),
					'permission_callback' => array( $this, 'can_create_page' ),
				),
			)
		);
		register_rest_route(
			'q2/v1',
			'/pages/(?P<id>\d+)',
			array(
				array(
					'methods'             => 'GET',
					'callback'            => array( $this, 'get_page' ),
					'permission_callback' => array( $this, 'can_read_page' ),
				),
				array(
					'methods'             => 'PATCH',
					'callback'            => array( $this, 'update_page' ),
					'permission_callback' => array( $this, 'can_edit_page' ),
				),
				array(
					'methods'             => 'DELETE',
					'callback'            => array( $this, 'delete_page' ),
					'permission_callback' => array( $this, 'can_delete_page' ),
				),
			)
		);
	}

	/**
	 * Reads pages the current user can access, presented as a tree.
	 *
	 * @param \WP_REST_Request $request Current request.
	 */
	public function index_pages( \WP_REST_Request $request ): \WP_REST_Response {
		$search = trim( (string) $request->get_param( 'search' ) );
		$query  = array(
			'post_type'      => 'page',
			'post_status'    => array( 'publish', 'draft', 'private' ),
			'posts_per_page' => 100,
			'orderby'        => 'menu_order title',
			'order'          => 'ASC',
		);
		if ( '' !== $search ) {
			$query['s']        = $search;
			$query['sentence'] = true;
		}

		$pages      = get_pages( $query );
		$hierarchy  = array();
		$by_parent  = array();
		$accessible = array();

		foreach ( $pages as $page ) {
			if ( ! current_user_can( 'read_post', $page->ID ) ) {
				continue;
			}
			$accessible[] = $page;
		}

		foreach ( $accessible as $page ) {
			$entry                             = $this->prepare_page_summary( $page );
			$by_parent[ $page->post_parent ][] = $entry;
		}

		$hierarchy = isset( $by_parent[0] ) ? $this->build_subtree( $by_parent, 0, 0 ) : array();

		return rest_ensure_response(
			array(
				'tree'    => $hierarchy,
				'recents' => array_slice(
					array_map( array( $this, 'prepare_page_summary' ), $accessible ),
					0,
					5
				),
				'total'   => count( $accessible ),
			)
		);
	}

	/**
	 * Reads a single page with rendered blocks.
	 *
	 * @param \WP_REST_Request $request Current request.
	 */
	public function get_page( \WP_REST_Request $request ): \WP_REST_Response|\WP_Error {
		$page = get_post( absint( $request->get_param( 'id' ) ) );
		if ( ! $page instanceof \WP_Post || 'page' !== $page->post_type ) {
			return new \WP_Error( 'q2_page_not_found', __( 'That page could not be found.', 'q2' ), array( 'status' => 404 ) );
		}

		return rest_ensure_response( $this->prepare_page_full( $page ) );
	}

	/**
	 * Creates a new page.
	 *
	 * @param \WP_REST_Request $request Current request.
	 */
	public function create_page( \WP_REST_Request $request ): \WP_REST_Response|\WP_Error {
		$title   = sanitize_text_field( (string) $request->get_param( 'title' ) );
		$parent  = absint( $request->get_param( 'parent' ) );
		$content = (string) $request->get_param( 'content' );
		$status  = sanitize_key( (string) $request->get_param( 'status' ) );

		if ( '' === $title ) {
			return new \WP_Error( 'q2_page_title_required', __( 'A page title is required.', 'q2' ), array( 'status' => 400 ) );
		}

		$post_parent = 0;
		if ( $parent > 0 ) {
			$parent_page = get_post( $parent );
			if ( ! $parent_page instanceof \WP_Post || 'page' !== $parent_page->post_type ) {
				return new \WP_Error( 'q2_invalid_parent', __( 'The parent page is invalid.', 'q2' ), array( 'status' => 400 ) );
			}
			if ( ! current_user_can( 'edit_post', $parent ) ) {
				return new \WP_Error( 'q2_forbidden_parent', __( 'You cannot place the page under that parent.', 'q2' ), array( 'status' => 403 ) );
			}
			$post_parent = $parent;
		}

		$post_status = current_user_can( 'publish_pages' ) ? 'publish' : 'draft';
		if ( current_user_can( 'publish_pages' ) && in_array( $status, array( 'publish', 'draft', 'private' ), true ) ) {
			$post_status = $status;
		}

		$page_id = wp_insert_post(
			array(
				'post_type'    => 'page',
				'post_status'  => $post_status,
				'post_title'   => $title,
				'post_content' => wp_kses_post( $content ),
				'post_parent'  => $post_parent,
				'post_author'  => get_current_user_id(),
				'menu_order'   => 0,
			),
			true
		);
		if ( is_wp_error( $page_id ) ) {
			return $page_id;
		}

		return new \WP_REST_Response( $this->prepare_page_full( get_post( $page_id ) ), 201 );
	}

	/**
	 * Updates an existing page.
	 *
	 * @param \WP_REST_Request $request Current request.
	 */
	public function update_page( \WP_REST_Request $request ): \WP_REST_Response|\WP_Error {
		$page_id = absint( $request->get_param( 'id' ) );
		$page    = get_post( $page_id );
		if ( ! $page instanceof \WP_Post || 'page' !== $page->post_type ) {
			return new \WP_Error( 'q2_page_not_found', __( 'That page could not be found.', 'q2' ), array( 'status' => 404 ) );
		}

		$payload = array( 'ID' => $page_id );

		if ( $request->has_param( 'title' ) ) {
			$payload['post_title'] = sanitize_text_field( (string) $request->get_param( 'title' ) );
		}

		if ( $request->has_param( 'content' ) ) {
			$payload['post_content'] = wp_kses_post( (string) $request->get_param( 'content' ) );
		}

		if ( $request->has_param( 'parent' ) ) {
			$parent      = absint( $request->get_param( 'parent' ) );
			$current_id  = $page_id;
			$safe_parent = 0;
			if ( $parent > 0 ) {
				$parent_page = get_post( $parent );
				if ( ! $parent_page instanceof \WP_Post || 'page' !== $parent_page->post_type ) {
					return new \WP_Error( 'q2_invalid_parent', __( 'The parent page is invalid.', 'q2' ), array( 'status' => 400 ) );
				}
				if ( ! current_user_can( 'edit_post', $parent ) ) {
					return new \WP_Error( 'q2_forbidden_parent', __( 'You cannot place the page under that parent.', 'q2' ), array( 'status' => 403 ) );
				}
				// Prevent cycles by walking up to the root.
				$cursor = $parent;
				while ( $cursor > 0 ) {
					if ( $cursor === $current_id ) {
						return new \WP_Error( 'q2_page_cycle', __( 'A page cannot be its own ancestor.', 'q2' ), array( 'status' => 400 ) );
					}
					$cursor = (int) get_post_field( 'post_parent', $cursor );
				}
				$safe_parent = $parent;
			}
			$payload['post_parent'] = $safe_parent;
		}

		if ( $request->has_param( 'status' ) ) {
			$status = sanitize_key( (string) $request->get_param( 'status' ) );
			if ( ! in_array( $status, array( 'publish', 'draft', 'private' ), true ) ) {
				return new \WP_Error( 'q2_invalid_status', __( 'That page status is not supported.', 'q2' ), array( 'status' => 400 ) );
			}
			if ( 'publish' === $status && ! current_user_can( 'publish_pages' ) ) {
				return new \WP_Error( 'q2_cannot_publish', __( 'You do not have permission to publish pages.', 'q2' ), array( 'status' => 403 ) );
			}
			$payload['post_status'] = $status;
		}

		$result = wp_update_post( $payload, true );
		if ( is_wp_error( $result ) ) {
			return $result;
		}

		return rest_ensure_response( $this->prepare_page_full( get_post( $page_id ) ) );
	}

	/**
	 * Moves a page to trash.
	 *
	 * @param \WP_REST_Request $request Current request.
	 */
	public function delete_page( \WP_REST_Request $request ): \WP_REST_Response|\WP_Error {
		$page_id = absint( $request->get_param( 'id' ) );
		$page    = get_post( $page_id );
		if ( ! $page instanceof \WP_Post || 'page' !== $page->post_type ) {
			return new \WP_Error( 'q2_page_not_found', __( 'That page could not be found.', 'q2' ), array( 'status' => 404 ) );
		}

		$result = wp_trash_post( $page_id );
		if ( ! $result ) {
			return new \WP_Error( 'q2_page_delete_failed', __( 'The page could not be deleted.', 'q2' ), array( 'status' => 500 ) );
		}

		return rest_ensure_response(
			array(
				'deleted' => true,
				'id'      => $page_id,
			)
		);
	}

	/**
	 * Checks whether the current user can create pages.
	 */
	public function can_create_page(): bool {
		return current_user_can( 'edit_pages' );
	}

	/**
	 * Checks read access on the requested page.
	 *
	 * @param \WP_REST_Request $request Current request.
	 */
	public function can_read_page( \WP_REST_Request $request ): bool {
		return current_user_can( 'read_post', absint( $request->get_param( 'id' ) ) );
	}

	/**
	 * Checks edit access on the requested page.
	 *
	 * @param \WP_REST_Request $request Current request.
	 */
	public function can_edit_page( \WP_REST_Request $request ): bool {
		return current_user_can( 'edit_post', absint( $request->get_param( 'id' ) ) );
	}

	/**
	 * Checks delete access on the requested page.
	 *
	 * @param \WP_REST_Request $request Current request.
	 */
	public function can_delete_page( \WP_REST_Request $request ): bool {
		return current_user_can( 'delete_post', absint( $request->get_param( 'id' ) ) );
	}

	/**
	 * Builds a nested page tree starting at a parent.
	 *
	 * @param array<int, array<string, mixed>> $by_parent Map of parent ID to entries.
	 * @param int                              $parent_id Current parent.
	 * @param int                              $depth Current depth for client rendering.
	 * @return array<int, array<string, mixed>>
	 */
	private function build_subtree( array $by_parent, int $parent_id, int $depth ): array {
		$nodes = array();
		foreach ( $by_parent[ $parent_id ] ?? array() as $entry ) {
			$entry['depth']       = $depth;
			$entry['hasChildren'] = ! empty( $by_parent[ $entry['id'] ] );
			$entry['children']    = $this->build_subtree( $by_parent, (int) $entry['id'], $depth + 1 );
			$nodes[]              = $entry;
		}
		return $nodes;
	}

	/**
	 * Builds a summary row for a page.
	 *
	 * @param \WP_Post $page Page post object.
	 * @return array<string, mixed>
	 */
	private function prepare_page_summary( \WP_Post $page ): array {
		return array(
			'id'         => (int) $page->ID,
			'title'      => get_the_title( $page ),
			'parent'     => (int) $page->post_parent,
			'status'     => $page->post_status,
			'author'     => (int) $page->post_author,
			'authorName' => get_the_author_meta( 'display_name', (int) $page->post_author ),
			'modified'   => mysql_to_rfc3339( $page->post_modified_gmt ),
			'excerpt'    => wp_trim_words( wp_strip_all_tags( $page->post_content ), 18 ),
			'menuOrder'  => (int) $page->menu_order,
			'canEdit'    => current_user_can( 'edit_post', $page->ID ),
			'canDelete'  => current_user_can( 'delete_post', $page->ID ),
		);
	}

	/**
	 * Builds a full page payload including rendered block content.
	 *
	 * @param \WP_Post $page Page post object.
	 * @return array<string, mixed>
	 */
	private function prepare_page_full( \WP_Post $page ): array {
		$summary               = $this->prepare_page_summary( $page );
		$summary['content']    = (string) $page->post_content;
		$summary['rendered']   = apply_filters( 'the_content', $page->post_content );
		$summary['dateGmt']    = mysql_to_rfc3339( $page->post_date_gmt );
		$summary['canPublish'] = current_user_can( 'publish_pages' );
		$summary['parents']    = array_reverse(
			array_map(
				static function ( int $parent_id ): array {
					$parent = get_post( $parent_id );
					if ( ! $parent instanceof \WP_Post ) {
						return array();
					}
					return array(
						'id'    => (int) $parent->ID,
						'title' => get_the_title( $parent ),
					);
				},
				$this->ancestor_ids( (int) $page->ID )
			)
		);
		return $summary;
	}

	/**
	 * Walks up the page hierarchy and returns ancestor IDs.
	 *
	 * @param int $page_id Page ID.
	 * @return int[]
	 */
	private function ancestor_ids( int $page_id ): array {
		$ancestors = array();
		$cursor    = (int) get_post_field( 'post_parent', $page_id );
		while ( $cursor > 0 && ! in_array( $cursor, $ancestors, true ) ) {
			$ancestors[] = $cursor;
			$cursor      = (int) get_post_field( 'post_parent', $cursor );
		}
		return $ancestors;
	}
}
