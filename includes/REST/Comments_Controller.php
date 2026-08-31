<?php
/**
 * Native WordPress comments exposed for the Q2 application.
 *
 * @package Q2
 */

declare( strict_types=1 );

namespace Q2\REST;

defined( 'ABSPATH' ) || exit;

/**
 * Provides rich comment CRUD while preserving WordPress comment ownership.
 */
final class Comments_Controller {
	private const ALLOWED_BLOCKS = array(
		'core/paragraph',
		'core/list',
		'core/list-item',
		'core/image',
		'core/quote',
		'core/code',
	);

	/**
	 * Hooks REST route registration.
	 */
	public function register(): void {
		add_action( 'rest_api_init', array( $this, 'register_routes' ) );
	}

	/**
	 * Registers comment collection and item routes.
	 */
	public function register_routes(): void {
		register_rest_route(
			'q2/v1',
			'/comments',
			array(
				array(
					'methods'             => 'GET',
					'callback'            => array( $this, 'get_comments' ),
					'permission_callback' => array( $this, 'can_read_post' ),
					'args'                => array(
						'post' => array(
							'required'          => true,
							'type'              => 'integer',
							'sanitize_callback' => 'absint',
						),
					),
				),
				array(
					'methods'             => 'POST',
					'callback'            => array( $this, 'create_comment' ),
					'permission_callback' => array( $this, 'can_create_comment' ),
				),
			)
		);

		register_rest_route(
			'q2/v1',
			'/comments/(?P<id>\d+)',
			array(
				array(
					'methods'             => 'PATCH',
					'callback'            => array( $this, 'update_comment' ),
					'permission_callback' => array( $this, 'can_modify_comment' ),
				),
				array(
					'methods'             => 'DELETE',
					'callback'            => array( $this, 'delete_comment' ),
					'permission_callback' => array( $this, 'can_modify_comment' ),
				),
			)
		);
	}

	/**
	 * Checks whether the requested post can be read by the current user.
	 *
	 * @param \WP_REST_Request $request Current REST request.
	 */
	public function can_read_post( \WP_REST_Request $request ): bool {
		$post_id = absint( $request->get_param( 'post' ) );
		return $post_id > 0 && current_user_can( 'read_post', $post_id );
	}

	/**
	 * Checks comment creation policy.
	 *
	 * @param \WP_REST_Request $request Current REST request.
	 */
	public function can_create_comment( \WP_REST_Request $request ): bool {
		$post_id = absint( $request->get_param( 'post' ) );
		return is_user_logged_in()
			&& $post_id > 0
			&& current_user_can( 'read_post', $post_id )
			&& comments_open( $post_id );
	}

	/**
	 * Checks author or moderator ownership for mutations.
	 *
	 * @param \WP_REST_Request $request Current REST request.
	 */
	public function can_modify_comment( \WP_REST_Request $request ): bool {
		$comment = get_comment( absint( $request->get_param( 'id' ) ) );
		if ( ! $comment instanceof \WP_Comment ) {
			return false;
		}

		return current_user_can( 'moderate_comments' )
			|| get_current_user_id() === (int) $comment->user_id;
	}

	/**
	 * Returns all approved comments for a post in chronological order.
	 *
	 * @param \WP_REST_Request $request Current REST request.
	 */
	public function get_comments( \WP_REST_Request $request ): \WP_REST_Response {
		$comments = get_comments(
			array(
				'post_id' => absint( $request->get_param( 'post' ) ),
				'status'  => 'approve',
				'orderby' => 'comment_date_gmt',
				'order'   => 'ASC',
				'number'  => 0,
			)
		);

		return rest_ensure_response( array_map( array( $this, 'prepare_comment' ), $comments ) );
	}

	/**
	 * Creates a native WordPress comment containing safe block markup.
	 *
	 * @param \WP_REST_Request $request Current REST request.
	 */
	public function create_comment( \WP_REST_Request $request ): \WP_REST_Response|\WP_Error {
		$post_id = absint( $request->get_param( 'post' ) );
		$parent  = absint( $request->get_param( 'parent' ) );
		$content = $this->sanitize_block_content( (string) $request->get_param( 'content' ) );
		if ( is_wp_error( $content ) ) {
			return $content;
		}

		if ( $parent > 0 ) {
			$parent_comment = get_comment( $parent );
			if ( ! $parent_comment instanceof \WP_Comment || (int) $parent_comment->comment_post_ID !== $post_id ) {
				return new \WP_Error( 'q2_invalid_parent', __( 'The parent comment is invalid.', 'q2' ), array( 'status' => 400 ) );
			}
		}

		$user       = wp_get_current_user();
		$comment_id = wp_new_comment(
			array(
				'comment_post_ID'      => $post_id,
				'comment_parent'       => $parent,
				'comment_content'      => $content,
				'user_id'              => $user->ID,
				'comment_author'       => $user->display_name,
				'comment_author_email' => $user->user_email,
			),
			true
		);
		if ( is_wp_error( $comment_id ) ) {
			return $comment_id;
		}

		return new \WP_REST_Response( $this->prepare_comment( get_comment( $comment_id ) ), 201 );
	}

	/**
	 * Updates a native comment after ownership validation.
	 *
	 * @param \WP_REST_Request $request Current REST request.
	 */
	public function update_comment( \WP_REST_Request $request ): \WP_REST_Response|\WP_Error {
		$content = $this->sanitize_block_content( (string) $request->get_param( 'content' ) );
		if ( is_wp_error( $content ) ) {
			return $content;
		}

		$result = wp_update_comment(
			array(
				'comment_ID'      => absint( $request->get_param( 'id' ) ),
				'comment_content' => $content,
			),
			true
		);
		if ( is_wp_error( $result ) ) {
			return $result;
		}

		return rest_ensure_response( $this->prepare_comment( get_comment( absint( $request->get_param( 'id' ) ) ) ) );
	}

	/**
	 * Moves an authorized comment to the WordPress trash.
	 *
	 * @param \WP_REST_Request $request Current REST request.
	 */
	public function delete_comment( \WP_REST_Request $request ): \WP_REST_Response|\WP_Error {
		$comment_id = absint( $request->get_param( 'id' ) );
		if ( ! wp_trash_comment( $comment_id ) ) {
			return new \WP_Error( 'q2_comment_delete_failed', __( 'The comment could not be deleted.', 'q2' ), array( 'status' => 500 ) );
		}

		return rest_ensure_response(
			array(
				'deleted' => true,
				'id'      => $comment_id,
			)
		);
	}

	/**
	 * Normalizes a comment for the private Q2 client.
	 *
	 * @param \WP_Comment|array<string, mixed>|null $comment Comment to normalize.
	 * @return array<string, mixed>
	 */
	private function prepare_comment( \WP_Comment|array|null $comment ): array {
		$comment = get_comment( $comment );
		if ( ! $comment instanceof \WP_Comment ) {
			return array();
		}

		$can_modify = current_user_can( 'moderate_comments' ) || get_current_user_id() === (int) $comment->user_id;
		return array(
			'id'         => (int) $comment->comment_ID,
			'post'       => (int) $comment->comment_post_ID,
			'parent'     => (int) $comment->comment_parent,
			'author'     => (int) $comment->user_id,
			'authorName' => get_comment_author( $comment ),
			'avatarUrl'  => get_avatar_url( $comment, array( 'size' => 64 ) ),
			'dateGmt'    => mysql_to_rfc3339( $comment->comment_date_gmt ),
			'content'    => $comment->comment_content,
			'rendered'   => do_blocks( $comment->comment_content ),
			'canEdit'    => $can_modify,
			'canDelete'  => $can_modify,
		);
	}

	/**
	 * Sanitizes serialized Gutenberg blocks and rejects unsupported blocks.
	 *
	 * @param string $content Serialized block markup.
	 * @return string|\WP_Error
	 */
	private function sanitize_block_content( string $content ): string|\WP_Error {
		$content = trim( $content );
		if ( '' === $content ) {
			return new \WP_Error( 'q2_empty_comment', __( 'Write a comment before saving.', 'q2' ), array( 'status' => 400 ) );
		}

		if ( ! $this->blocks_are_allowed( parse_blocks( $content ) ) ) {
			return new \WP_Error( 'q2_disallowed_comment_block', __( 'That block is not supported in comments.', 'q2' ), array( 'status' => 400 ) );
		}

		return wp_kses_post( $content );
	}

	/**
	 * Recursively checks parsed blocks against the comment allowlist.
	 *
	 * @param array<int, array<string, mixed>> $blocks Parsed blocks.
	 */
	private function blocks_are_allowed( array $blocks ): bool {
		foreach ( $blocks as $block ) {
			$name = (string) ( $block['blockName'] ?? '' );
			if ( '' !== $name && ! in_array( $name, self::ALLOWED_BLOCKS, true ) ) {
				return false;
			}

			$inner_blocks = $block['innerBlocks'] ?? array();
			if ( is_array( $inner_blocks ) && ! $this->blocks_are_allowed( $inner_blocks ) ) {
				return false;
			}
		}

		return true;
	}
}
