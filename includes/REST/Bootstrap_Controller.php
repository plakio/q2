<?php
/**
 * Q2 REST bootstrap and health endpoint.
 *
 * @package Q2
 */

declare( strict_types=1 );

namespace Q2\REST;

defined( 'ABSPATH' ) || exit;

/**
 * Exposes a small authenticated health/bootstrap resource.
 */
final class Bootstrap_Controller {
	/**
	 * Hooks REST route registration.
	 */
	public function register(): void {
		add_action( 'rest_api_init', array( $this, 'register_routes' ) );
	}

	/**
	 * Registers the Q2 bootstrap route.
	 */
	public function register_routes(): void {
		register_rest_route(
			'q2/v1',
			'/bootstrap',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'get_bootstrap' ),
				'permission_callback' => static fn(): bool => current_user_can( 'read' ),
			)
		);
	}

	/**
	 * Returns stable application identity and discovery links.
	 */
	public function get_bootstrap(): \WP_REST_Response {
		return new \WP_REST_Response(
			array(
				'name'    => 'Q2',
				'version' => Q2_VERSION,
				'userId'  => get_current_user_id(),
				'links'   => array(
					'feed' => rest_url( 'wp/v2/posts' ),
				),
			),
			200
		);
	}
}
