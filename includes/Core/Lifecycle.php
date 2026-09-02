<?php
/**
 * Q2 site and network lifecycle.
 *
 * @package Q2
 */

declare( strict_types=1 );

namespace Q2\Core;

defined( 'ABSPATH' ) || exit;

use Q2\Tasks\Cron;

/**
 * Provisions each site as an independent Q2 workspace.
 */
final class Lifecycle {
	private const NETWORK_VERSION = '1';

	/**
	 * Registers Multisite lifecycle hooks.
	 */
	public static function register(): void {
		add_action( 'wp_initialize_site', array( __CLASS__, 'initialize_site' ), 100, 2 );
		add_filter( 'wpmu_drop_tables', array( __CLASS__, 'drop_tables' ), 10, 2 );
		self::maybe_upgrade_network();
	}

	/**
	 * Handles regular and network-wide activation.
	 *
	 * @param bool $network_wide Whether Q2 was activated for the network.
	 */
	public static function activate( bool $network_wide ): void {
		if ( is_multisite() && $network_wide ) {
			$network_id = get_current_network_id();
			self::for_network_sites( $network_id, array( __CLASS__, 'provision_site' ) );
			update_network_option( $network_id, 'q2_network_lifecycle_version', self::NETWORK_VERSION );
			return;
		}

		self::provision_site( get_current_blog_id() );
	}

	/**
	 * Provisions existing sites once when a network-active Q2 is upgraded.
	 */
	public static function maybe_upgrade_network(): void {
		if ( ! is_multisite() ) {
			return;
		}

		$network_id = get_current_network_id();
		if (
			! self::is_network_active( $network_id ) ||
			self::NETWORK_VERSION === get_network_option( $network_id, 'q2_network_lifecycle_version' )
		) {
			return;
		}

		self::for_network_sites( $network_id, array( __CLASS__, 'provision_site' ) );
		update_network_option( $network_id, 'q2_network_lifecycle_version', self::NETWORK_VERSION );
	}

	/**
	 * Handles regular and network-wide deactivation.
	 *
	 * @param bool $network_wide Whether Q2 is being deactivated for the network.
	 */
	public static function deactivate( bool $network_wide ): void {
		if ( is_multisite() && $network_wide ) {
			self::for_network_sites( get_current_network_id(), array( __CLASS__, 'deactivate_site' ) );
			return;
		}

		self::deactivate_site( get_current_blog_id() );
	}

	/**
	 * Provisions a newly initialized site when Q2 is network active.
	 *
	 * @param \WP_Site             $site New site.
	 * @param array<string, mixed> $args Site initialization arguments.
	 */
	public static function initialize_site( \WP_Site $site, array $args ): void { // phpcs:ignore Generic.CodeAnalysis.UnusedFunctionParameter.FoundAfterLastUsed
		if ( self::is_network_active( (int) $site->network_id ) ) {
			self::provision_site( (int) $site->blog_id );
		}
	}

	/**
	 * Returns whether Q2 is available on a site.
	 *
	 * @param int $site_id Site ID.
	 */
	public static function is_active_for_site( int $site_id ): bool {
		if ( ! is_multisite() ) {
			return get_current_blog_id() === $site_id;
		}

		$site = get_site( $site_id );
		if ( ! $site instanceof \WP_Site ) {
			return false;
		}

		if ( self::is_network_active( (int) $site->network_id ) ) {
			return true;
		}

		$active_plugins = get_blog_option( $site_id, 'active_plugins', array() );
		return is_array( $active_plugins ) && in_array( self::plugin_basename(), $active_plugins, true );
	}

	/**
	 * Appends Q2-owned tables to the normal site deletion list.
	 *
	 * @param string[] $tables  Tables WordPress will drop.
	 * @param int      $site_id Site being deleted.
	 * @return string[]
	 */
	public static function drop_tables( array $tables, int $site_id ): array {
		global $wpdb;

		$prefix = $wpdb->get_blog_prefix( $site_id ) . 'q2_';
		foreach ( array( 'notifications', 'reads', 'follows', 'reactions', 'mentions', 'tasks' ) as $suffix ) {
			$tables[] = $prefix . $suffix;
		}

		return array_values( array_unique( $tables ) );
	}

	/**
	 * Installs Q2 in one site context.
	 *
	 * @param int $site_id Site ID.
	 */
	private static function provision_site( int $site_id ): void {
		self::in_site(
			$site_id,
			static function (): void {
				Capabilities::activate();
				Installer::install();
				Cron::ensure_scheduled();
				delete_option( 'rewrite_rules' );
			}
		);
	}

	/**
	 * Removes runtime state without deleting workspace data.
	 *
	 * @param int $site_id Site ID.
	 */
	private static function deactivate_site( int $site_id ): void {
		self::in_site(
			$site_id,
			static function (): void {
				wp_clear_scheduled_hook( Cron::HOOK );
				delete_option( 'rewrite_rules' );
			}
		);
	}

	/**
	 * Runs an operation for all initialized sites in a network.
	 *
	 * @param int                $network_id Network ID.
	 * @param callable(int):void $callback Site callback.
	 */
	private static function for_network_sites( int $network_id, callable $callback ): void {
		$site_ids = get_sites(
			array(
				'network_id' => $network_id,
				'fields'     => 'ids',
				'number'     => 0,
			)
		);

		foreach ( $site_ids as $site_id ) {
			if ( wp_is_site_initialized( (int) $site_id ) ) {
				$callback( (int) $site_id );
			}
		}
	}

	/**
	 * Runs a callback in a site context and always restores the previous site.
	 *
	 * @param int             $site_id Site ID.
	 * @param callable():void $callback Site operation.
	 */
	private static function in_site( int $site_id, callable $callback ): void {
		$switched = get_current_blog_id() !== $site_id;
		if ( $switched && ! switch_to_blog( $site_id ) ) {
			return;
		}

		try {
			$callback();
		} finally {
			if ( $switched ) {
				restore_current_blog();
			}
		}
	}

	/**
	 * Checks the supplied network's active-sitewide plugin registry.
	 *
	 * @param int $network_id Network ID.
	 */
	private static function is_network_active( int $network_id ): bool {
		if ( ! is_multisite() ) {
			return false;
		}

		$active = get_network_option( $network_id, 'active_sitewide_plugins', array() );
		return is_array( $active ) && isset( $active[ self::plugin_basename() ] );
	}

	/**
	 * Returns Q2's canonical plugin basename.
	 */
	private static function plugin_basename(): string {
		return plugin_basename( Q2_PATH . 'q2.php' );
	}
}
