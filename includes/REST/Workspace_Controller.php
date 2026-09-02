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
use Q2\Core\Lifecycle;
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
		register_rest_route(
			'q2/v1',
			'/workspaces',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'get_workspaces' ),
				'permission_callback' => static fn(): bool => is_user_logged_in(),
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
	 * Returns Q2 workspaces the current user may access in this network.
	 */
	public function get_workspaces(): \WP_REST_Response {
		if ( ! is_multisite() ) {
			return rest_ensure_response( array() );
		}

		$user_id       = get_current_user_id();
		$current_id    = get_current_blog_id();
		$network_id    = get_current_network_id();
		$candidate_ids = array();

		if ( is_super_admin( $user_id ) ) {
			$candidate_ids = get_sites(
				array(
					'network_id' => $network_id,
					'fields'     => 'ids',
					'number'     => 0,
					'archived'   => 0,
					'spam'       => 0,
					'deleted'    => 0,
				)
			);
		} else {
			foreach ( get_blogs_of_user( $user_id, false ) as $blog ) {
				$candidate_ids[] = (int) $blog->userblog_id;
			}
		}

		$candidate_ids[] = $current_id;
		$workspaces      = array();
		foreach ( array_unique( array_map( 'intval', $candidate_ids ) ) as $site_id ) {
			$site = get_site( $site_id );
			if (
				! $site instanceof \WP_Site ||
				(int) $site->network_id !== $network_id ||
				! wp_is_site_initialized( $site_id ) ||
				(int) $site->archived ||
				(int) $site->spam ||
				(int) $site->deleted ||
				! Lifecycle::is_active_for_site( $site_id ) ||
				! user_can_for_site( $user_id, $site_id, 'read' )
			) {
				continue;
			}

			$workspaces[] = $this->workspace_summary( $site_id, $site_id === $current_id );
		}

		usort(
			$workspaces,
			static function ( array $left, array $right ): int {
				if ( $left['isCurrent'] !== $right['isCurrent'] ) {
					return $left['isCurrent'] ? -1 : 1;
				}
				return strcasecmp( $left['name'], $right['name'] );
			}
		);

		return rest_ensure_response( $workspaces );
	}

	/**
	 * Builds a safe public summary in the target site context.
	 *
	 * @param int  $site_id    Site ID.
	 * @param bool $is_current Whether this is the request's current site.
	 * @return array{id: int, name: string, homeUrl: string, iconUrl: string|null, isCurrent: bool}
	 */
	private function workspace_summary( int $site_id, bool $is_current ): array {
		$switched = get_current_blog_id() !== $site_id;
		if ( $switched ) {
			switch_to_blog( $site_id );
		}

		try {
			$workspace_icon_id = (int) get_option( self::OPTION_ICON, 0 );
			$icon_url          = $workspace_icon_id > 0 ? wp_get_attachment_image_url( $workspace_icon_id, 'thumbnail' ) : '';
			if ( ! $icon_url ) {
				$icon_url = get_site_icon_url( 96 );
			}
			return array(
				'id'        => $site_id,
				'name'      => sanitize_text_field( get_bloginfo( 'name' ) ),
				'homeUrl'   => esc_url_raw( home_url( '/' ), array( 'http', 'https' ) ),
				'iconUrl'   => $icon_url ? esc_url_raw( $icon_url, array( 'http', 'https' ) ) : null,
				'isCurrent' => $is_current,
			);
		} finally {
			if ( $switched ) {
				restore_current_blog();
			}
		}
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
