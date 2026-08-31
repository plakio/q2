<?php
/**
 * Q2 Media REST controller.
 *
 * @package Q2
 */

declare( strict_types=1 );

namespace Q2\REST;

defined( 'ABSPATH' ) || exit;

/**
 * Provides a focused Media screen surface backed by native attachments.
 *
 * Routes:
 *  - GET    /media                       — list attachments
 *  - GET    /media/(?P<id>\d+)           — read a single attachment
 *  - PATCH  /media/(?P<id>\d+)           — update attachment metadata
 *  - DELETE /media/(?P<id>\d+)           — trash attachment
 */
final class Media_Controller {
	/**
	 * Hooks REST registration.
	 */
	public function register(): void {
		add_action( 'rest_api_init', array( $this, 'register_routes' ) );
	}

	/**
	 * Registers media routes.
	 */
	public function register_routes(): void {
		register_rest_route(
			'q2/v1',
			'/media',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'list_media' ),
				'permission_callback' => static fn(): bool => current_user_can( 'read' ),
				'args'                => array(
					'search'  => array(
						'type'              => 'string',
						'sanitize_callback' => 'sanitize_text_field',
					),
					'mime'    => array(
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
			'/media/(?P<id>\d+)',
			array(
				array(
					'methods'             => 'GET',
					'callback'            => array( $this, 'get_attachment' ),
					'permission_callback' => array( $this, 'can_read_media' ),
				),
				array(
					'methods'             => 'PATCH',
					'callback'            => array( $this, 'update_media' ),
					'permission_callback' => array( $this, 'can_edit_media' ),
				),
				array(
					'methods'             => 'DELETE',
					'callback'            => array( $this, 'delete_media' ),
					'permission_callback' => array( $this, 'can_delete_media' ),
				),
			)
		);
	}

	/**
	 * Returns a page of readable attachments.
	 *
	 * @param \WP_REST_Request $request Current request.
	 */
	public function list_media( \WP_REST_Request $request ): \WP_REST_Response {
		$per_page = max( 1, min( 100, (int) $request->get_param( 'perPage' ) ) );
		$page     = max( 1, (int) $request->get_param( 'page' ) );
		$mime     = trim( (string) $request->get_param( 'mime' ) );
		$search   = trim( (string) $request->get_param( 'search' ) );

		$query = array(
			'post_type'      => 'attachment',
			'posts_per_page' => $per_page,
			'paged'          => $page,
			'orderby'        => 'date',
			'order'          => 'DESC',
		);
		// Permissions: only return attachments the user can read.
		// Visibility is also enforced per-attachment in `prepare_attachment()` via `current_user_can( 'read_post', … )`.
		$query['post_status'] = array( 'inherit' );
		if ( is_user_logged_in() && current_user_can( 'read_private_posts' ) ) {
			$query['post_status'][] = 'private';
		}
		if ( '' !== $mime ) {
			$query['post_mime_type'] = $mime;
		}
		if ( '' !== $search ) {
			$query['s'] = $search;
		}
		$query_obj   = new \WP_Query( $query );
		$attachments = $query_obj->get_posts();
		$total       = (int) $query_obj->found_posts;

		$items = array_values(
			array_filter(
				array_map(
					array( $this, 'prepare_attachment' ),
					$attachments
				)
			)
		);

		return rest_ensure_response(
			array(
				'items'      => $items,
				'total'      => $total,
				'totalPages' => (int) ceil( max( $total, 1 ) / $per_page ),
			)
		);
	}

	/**
	 * Returns a single attachment by ID.
	 *
	 * @param \WP_REST_Request $request Current request.
	 */
	public function get_attachment( \WP_REST_Request $request ): \WP_REST_Response|\WP_Error {
		$attachment = get_post( absint( $request->get_param( 'id' ) ) );
		if ( ! $attachment instanceof \WP_Post || 'attachment' !== $attachment->post_type ) {
			return new \WP_Error( 'q2_media_not_found', __( 'That media could not be found.', 'q2' ), array( 'status' => 404 ) );
		}
		$payload = $this->prepare_attachment( $attachment );
		if ( null === $payload ) {
			return new \WP_Error( 'q2_media_forbidden', __( 'You do not have permission to view that media.', 'q2' ), array( 'status' => 403 ) );
		}
		return rest_ensure_response( $payload );
	}

	/**
	 * Updates attachment metadata.
	 *
	 * @param \WP_REST_Request $request Current request.
	 */
	public function update_media( \WP_REST_Request $request ): \WP_REST_Response|\WP_Error {
		$attachment_id = absint( $request->get_param( 'id' ) );
		$attachment    = get_post( $attachment_id );
		if ( ! $attachment instanceof \WP_Post || 'attachment' !== $attachment->post_type ) {
			return new \WP_Error( 'q2_media_not_found', __( 'That media could not be found.', 'q2' ), array( 'status' => 404 ) );
		}

		$payload = array( 'ID' => $attachment_id );

		if ( $request->has_param( 'title' ) ) {
			$payload['post_title'] = sanitize_text_field( (string) $request->get_param( 'title' ) );
		}
		if ( $request->has_param( 'caption' ) ) {
			$payload['post_excerpt'] = sanitize_textarea_field( (string) $request->get_param( 'caption' ) );
		}
		if ( $request->has_param( 'description' ) ) {
			$payload['post_content'] = sanitize_textarea_field( (string) $request->get_param( 'description' ) );
		}

		$result = wp_update_post( $payload, true );
		if ( is_wp_error( $result ) ) {
			return $result;
		}

		return rest_ensure_response( $this->prepare_attachment( get_post( $attachment_id ) ) );
	}

	/**
	 * Trash an attachment.
	 *
	 * @param \WP_REST_Request $request Current request.
	 */
	public function delete_media( \WP_REST_Request $request ): \WP_REST_Response|\WP_Error {
		$attachment_id = absint( $request->get_param( 'id' ) );
		$attachment    = get_post( $attachment_id );
		if ( ! $attachment instanceof \WP_Post || 'attachment' !== $attachment->post_type ) {
			return new \WP_Error( 'q2_media_not_found', __( 'That media could not be found.', 'q2' ), array( 'status' => 404 ) );
		}

		if ( ! wp_delete_attachment( $attachment_id, false ) ) {
			return new \WP_Error( 'q2_media_delete_failed', __( 'The media could not be deleted.', 'q2' ), array( 'status' => 500 ) );
		}

		return rest_ensure_response(
			array(
				'deleted' => true,
				'id'      => $attachment_id,
			)
		);
	}

	/**
	 * Permission callback: read a single attachment.
	 *
	 * @param \WP_REST_Request $request Current request.
	 */
	public function can_read_media( \WP_REST_Request $request ): bool {
		return current_user_can( 'read_post', absint( $request->get_param( 'id' ) ) );
	}

	/**
	 * Permission callback: edit a single attachment.
	 *
	 * @param \WP_REST_Request $request Current request.
	 */
	public function can_edit_media( \WP_REST_Request $request ): bool {
		return current_user_can( 'edit_post', absint( $request->get_param( 'id' ) ) );
	}

	/**
	 * Permission callback: delete a single attachment.
	 *
	 * @param \WP_REST_Request $request Current request.
	 */
	public function can_delete_media( \WP_REST_Request $request ): bool {
		return current_user_can( 'delete_post', absint( $request->get_param( 'id' ) ) );
	}

	/**
	 * Builds a normalized attachment payload.
	 *
	 * @param \WP_Post|false|null $attachment Attachment post.
	 * @return array<string, mixed>|null
	 */
	private function prepare_attachment( \WP_Post|false|null $attachment ): ?array {
		if ( ! $attachment instanceof \WP_Post || 'attachment' !== $attachment->post_type ) {
			return null;
		}
		if ( ! current_user_can( 'read_post', $attachment->ID ) ) {
			return null;
		}

		$url   = wp_get_attachment_url( $attachment->ID );
		$file  = get_attached_file( $attachment->ID );
		$sizes = array();
		if ( wp_attachment_is_image( $attachment->ID ) ) {
			foreach ( (array) wp_get_attachment_metadata( $attachment->ID ) as $key => $values ) {
				if ( is_array( $values ) && isset( $values['file'], $values['width'], $values['height'] ) ) {
					$src = wp_get_attachment_image_src( $attachment->ID, $key );
					if ( $src ) {
						$sizes[ $key ] = array(
							'url'    => $src[0],
							'width'  => (int) $src[1],
							'height' => (int) $src[2],
						);
					}
				}
			}
		}

		$author = (int) $attachment->post_author;

		return array(
			'id'          => (int) $attachment->ID,
			'title'       => get_the_title( $attachment ),
			'caption'     => $attachment->post_excerpt,
			'description' => $attachment->post_content,
			'filename'    => $file ? basename( $file ) : '',
			'mime'        => $attachment->post_mime_type,
			'url'         => $url ? $url : '',
			'isImage'     => wp_attachment_is_image( $attachment->ID ),
			'sizes'       => $sizes,
			'author'      => $author,
			'authorName'  => get_the_author_meta( 'display_name', $author ),
			'dateGmt'     => mysql_to_rfc3339( $attachment->post_date_gmt ),
			'alt'         => get_post_meta( $attachment->ID, '_wp_attachment_image_alt', true ),
			'canEdit'     => current_user_can( 'edit_post', $attachment->ID ),
			'canDelete'   => current_user_can( 'delete_post', $attachment->ID ),
		);
	}
}
