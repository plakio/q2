<?php
/**
 * Workspace people REST controller.
 *
 * @package Q2
 */

declare( strict_types=1 );

namespace Q2\REST;

defined( 'ABSPATH' ) || exit;

/**
 * Returns site members without exposing private user fields.
 */
final class People_Controller {
	/**
	 * Hooks route registration.
	 */
	public function register(): void {
		add_action( 'rest_api_init', array( $this, 'register_routes' ) );
	}

	/**
	 * Registers the member collection endpoint.
	 */
	public function register_routes(): void {
		register_rest_route(
			'q2/v1',
			'/people',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'get_people' ),
				'permission_callback' => static fn(): bool => current_user_can( 'read' ),
				'args'                => array(
					'search' => array(
						'type'              => 'string',
						'sanitize_callback' => 'sanitize_text_field',
					),
				),
			)
		);
	}

	/**
	 * Returns public profiles for users who belong to this site.
	 *
	 * @param \WP_REST_Request $request REST request.
	 */
	public function get_people( \WP_REST_Request $request ): \WP_REST_Response {
		$args = array(
			'blog_id' => get_current_blog_id(),
			'number'  => 100,
			'orderby' => 'display_name',
			'order'   => 'ASC',
		);

		$search = trim( (string) $request->get_param( 'search' ) );
		if ( '' !== $search ) {
			$args['search']         = '*' . $search . '*';
			$args['search_columns'] = array( 'user_login', 'user_nicename', 'display_name' );
		}

		$people = array_map(
			static function ( \WP_User $user ): array {
				return array(
					'id'        => $user->ID,
					'name'      => $user->display_name,
					'slug'      => $user->user_nicename,
					'avatarUrl' => get_avatar_url( $user->ID, array( 'size' => 96 ) ),
					'roles'     => array_values( $user->roles ),
				);
			},
			get_users( $args )
		);

		return rest_ensure_response( $people );
	}
}
