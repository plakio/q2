<?php
/**
 * Workspace links backed by a WordPress Navigation entity.
 *
 * @package Q2
 */

declare( strict_types=1 );

namespace Q2\Workspace;

defined( 'ABSPATH' ) || exit;

/**
 * Creates, reads, and migrates the navigation used in the Q2 sidebar.
 */
final class Navigation {
	private const OPTION_ID     = 'q2_workspace_navigation_id';
	private const OPTION_LEGACY = 'q2_workspace_links';

	/**
	 * Returns links from the configured navigation, or legacy links as fallback.
	 *
	 * @return array<int, array{id: string, label: string, url: string, newTab: bool, depth: int}>
	 */
	public static function links(): array {
		$navigation = self::navigation();
		if ( ! $navigation instanceof \WP_Post ) {
			$navigation = self::maybe_create();
		}

		if ( $navigation instanceof \WP_Post ) {
			$links = array();
			self::collect_links( parse_blocks( $navigation->post_content ), $links );
			return $links;
		}

		return self::legacy_links();
	}

	/**
	 * Returns the native Navigation editor URL for workspace administrators.
	 */
	public static function edit_url(): ?string {
		if ( ! current_user_can( 'edit_theme_options' ) ) {
			return null;
		}

		$navigation = self::navigation() ?? self::maybe_create();
		if ( ! $navigation instanceof \WP_Post ) {
			return null;
		}

		$url = get_edit_post_link( $navigation->ID, 'raw' );
		return is_string( $url ) && '' !== $url ? $url : null;
	}

	/**
	 * Gets the selected navigation when it is still valid.
	 */
	private static function navigation(): ?\WP_Post {
		$navigation_id = (int) get_option( self::OPTION_ID, 0 );
		$navigation    = $navigation_id > 0 ? get_post( $navigation_id ) : null;

		if ( ! $navigation instanceof \WP_Post || 'wp_navigation' !== $navigation->post_type || 'trash' === $navigation->post_status ) {
			return null;
		}

		return $navigation;
	}

	/**
	 * Creates the workspace navigation and imports legacy links once.
	 */
	private static function maybe_create(): ?\WP_Post {
		if ( ! current_user_can( 'edit_theme_options' ) || ! post_type_exists( 'wp_navigation' ) ) {
			return null;
		}

		$blocks = array_map(
			static function ( array $link ): array {
				return array(
					'blockName'    => 'core/navigation-link',
					'attrs'        => array(
						'label'          => $link['label'],
						'url'            => $link['url'],
						'opensInNewTab'  => $link['newTab'],
						'kind'           => 'custom',
						'isTopLevelLink' => true,
					),
					'innerBlocks'  => array(),
					'innerHTML'    => '',
					'innerContent' => array(),
				);
			},
			self::legacy_links()
		);

		$navigation_id = wp_insert_post(
			array(
				'post_type'    => 'wp_navigation',
				'post_status'  => 'publish',
				'post_title'   => __( 'Q2 Workspace Links', 'q2' ),
				'post_content' => serialize_blocks( $blocks ),
			),
			true
		);

		if ( is_wp_error( $navigation_id ) || $navigation_id <= 0 ) {
			return null;
		}

		update_option( self::OPTION_ID, $navigation_id, false );
		$navigation = get_post( $navigation_id );
		return $navigation instanceof \WP_Post ? $navigation : null;
	}

	/**
	 * Converts Navigation blocks into the small DTO consumed by the sidebar.
	 *
	 * @param array<int, array<string, mixed>> $blocks Parsed blocks.
	 * @param array<int, array<string, mixed>> $links Collected links.
	 * @param int                              $depth Current nesting depth.
	 */
	private static function collect_links( array $blocks, array &$links, int $depth = 0 ): void {
		foreach ( $blocks as $index => $block ) {
			$name  = isset( $block['blockName'] ) ? (string) $block['blockName'] : '';
			$attrs = isset( $block['attrs'] ) && is_array( $block['attrs'] ) ? $block['attrs'] : array();

			if ( in_array( $name, array( 'core/navigation-link', 'core/navigation-submenu' ), true ) ) {
				$label = sanitize_text_field( wp_strip_all_tags( (string) ( $attrs['label'] ?? '' ) ) );
				$url   = esc_url_raw( (string) ( $attrs['url'] ?? '' ) );
				if ( '' !== $label && '' !== $url ) {
					$links[] = array(
						'id'     => 'navigation-' . md5( $depth . ':' . $index . ':' . $label . ':' . $url ),
						'label'  => $label,
						'url'    => $url,
						'newTab' => ! empty( $attrs['opensInNewTab'] ),
						'depth'  => $depth,
					);
				}
			}

			$children = isset( $block['innerBlocks'] ) && is_array( $block['innerBlocks'] ) ? $block['innerBlocks'] : array();
			if ( $children ) {
				self::collect_links( $children, $links, 'core/navigation-submenu' === $name ? $depth + 1 : $depth );
			}
		}
	}

	/**
	 * Reads and normalizes the previous option without deleting it.
	 *
	 * @return array<int, array{id: string, label: string, url: string, newTab: bool, depth: int}>
	 */
	private static function legacy_links(): array {
		$stored = get_option( self::OPTION_LEGACY, array() );
		if ( ! is_array( $stored ) ) {
			return array();
		}

		$links = array();
		foreach ( $stored as $index => $link ) {
			if ( ! is_array( $link ) ) {
				continue;
			}

			$label = sanitize_text_field( (string) ( $link['label'] ?? '' ) );
			$url   = esc_url_raw( (string) ( $link['url'] ?? '' ) );
			if ( '' === $label || '' === $url ) {
				continue;
			}

			$links[] = array(
				'id'     => sanitize_key( (string) ( $link['id'] ?? 'legacy-' . $index ) ),
				'label'  => $label,
				'url'    => $url,
				'newTab' => ! empty( $link['newTab'] ),
				'depth'  => 0,
			);
		}

		return $links;
	}
}
