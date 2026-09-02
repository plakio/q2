<?php
/**
 * Q2 Workspace REST controller.
 *
 * @package Q2
 */

declare( strict_types=1 );

namespace Q2\REST;

defined( 'ABSPATH' ) || exit;

use Q2\Core\Capabilities;
use Q2\Workspace\Navigation;

/**
 * Exposes workspace identity settings (cover image, icon) for editing.
 *
 * Routes:
 *  - GET    /workspace            — read workspace identity
 *  - PATCH  /workspace            — update workspace identity
 */
final class Workspace_Controller {
	private const OPTION_COVER = 'q2_workspace_cover_id';
	private const OPTION_ICON  = 'q2_workspace_icon_id';

	/**
	 * Hooks REST registration.
	 */
	public function register(): void {
		add_action( 'rest_api_init', array( $this, 'register_routes' ) );
	}

	/**
	 * Registers workspace routes.
	 */
	public function register_routes(): void {
		register_rest_route(
			'q2/v1',
			'/workspace',
			array(
				array(
					'methods'             => 'GET',
					'callback'            => array( $this, 'get_workspace' ),
					'permission_callback' => static fn(): bool => current_user_can( 'read' ),
				),
				array(
					'methods'             => 'PATCH',
					'callback'            => array( $this, 'update_workspace' ),
					'permission_callback' => array( $this, 'can_manage' ),
				),
			)
		);
		register_rest_route(
			'q2/v1',
			'/workspace/links',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'get_links' ),
				'permission_callback' => static fn(): bool => current_user_can( 'read' ),
			)
		);
	}

	/**
	 * Permission callback for workspace mutations.
	 */
	public function can_manage(): bool {
		return current_user_can( Capabilities::MANAGE );
	}

	/**
	 * Returns the current workspace identity.
	 */
	public function get_workspace(): \WP_REST_Response {
		return rest_ensure_response( $this->payload() );
	}

	/**
	 * Updates the workspace identity.
	 *
	 * Accepts:
	 *  - coverId: int|null — attachment ID for the cover image, or null to remove
	 *  - iconId:  int|null — attachment ID for the workspace icon, or null to remove
	 *
	 * @param \WP_REST_Request $request Current request.
	 */
	public function update_workspace( \WP_REST_Request $request ): \WP_REST_Response|\WP_Error {
		if ( $request->has_param( 'coverId' ) ) {
			$cover  = $request->get_param( 'coverId' );
			$result = $this->save_attachment_option(
				self::OPTION_COVER,
				null === $cover ? null : absint( $cover )
			);
			if ( is_wp_error( $result ) ) {
				return $result;
			}
		}

		if ( $request->has_param( 'iconId' ) ) {
			$icon   = $request->get_param( 'iconId' );
			$result = $this->save_attachment_option(
				self::OPTION_ICON,
				null === $icon ? null : absint( $icon )
			);
			if ( is_wp_error( $result ) ) {
				return $result;
			}
		}

		return rest_ensure_response( $this->payload() );
	}

	/**
	 * Returns links from the workspace Navigation entity.
	 */
	public function get_links(): \WP_REST_Response {
		return rest_ensure_response( Navigation::links() );
	}

	/**
	 * Persists an attachment-backed option, validating that the attachment exists.
	 *
	 * @param string   $option Option name.
	 * @param int|null $attachment_id Attachment ID or null to clear.
	 * @return true|\WP_Error
	 */
	private function save_attachment_option( string $option, ?int $attachment_id ) {
		if ( null !== $attachment_id && $attachment_id > 0 ) {
			$attachment = get_post( $attachment_id );
			if ( ! $attachment instanceof \WP_Post || 'attachment' !== $attachment->post_type ) {
				return new \WP_Error(
					'q2_workspace_attachment_invalid',
					__( 'That image could not be found.', 'q2' ),
					array( 'status' => 400 )
				);
			}
		}

		if ( null === $attachment_id || 0 === $attachment_id ) {
			delete_option( $option );
		} else {
			update_option( $option, $attachment_id, false );
		}

		return true;
	}

	/**
	 * Builds the workspace identity payload.
	 *
	 * @return array<string, mixed>
	 */
	private function payload(): array {
		$cover_id = (int) get_option( self::OPTION_COVER, 0 );
		$icon_id  = (int) get_option( self::OPTION_ICON, 0 );

		$cover_url = $cover_id > 0 ? wp_get_attachment_image_url( $cover_id, 'large' ) : '';
		$icon_url  = $icon_id > 0 ? wp_get_attachment_image_url( $icon_id, 'medium' ) : '';

		return array(
			'coverId'  => $cover_id > 0 ? $cover_id : null,
			'coverUrl' => $cover_url ? $cover_url : null,
			'iconId'   => $icon_id > 0 ? $icon_id : null,
			'iconUrl'  => $icon_url ? $icon_url : null,
			'canEdit'  => current_user_can( Capabilities::MANAGE ),
		);
	}
}
