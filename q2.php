<?php
/**
 * Plugin Name:       Q2
 * Plugin URI:        https://github.com/plakio/q2
 * Description:       A modern, self-hosted collaborative workspace for WordPress.
 * Version:           0.1.7
 * Requires at least: 7.1
 * Requires PHP:      8.1
 * Author:            Plak
 * Author URI:        https://plak.io/
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       q2
 * Update URI:        https://github.com/plakio/q2
 *
 * @package Q2
 */

defined( 'ABSPATH' ) || exit;

define( 'Q2_VERSION', '0.1.7' );
define( 'Q2_PATH', plugin_dir_path( __FILE__ ) );
define( 'Q2_URL', plugin_dir_url( __FILE__ ) );

spl_autoload_register(
	static function ( string $fqcn ): void {
		$prefix = 'Q2\\';
		if ( 0 !== strncmp( $fqcn, $prefix, strlen( $prefix ) ) ) {
			return;
		}

		$relative = str_replace( '\\', DIRECTORY_SEPARATOR, substr( $fqcn, strlen( $prefix ) ) );
		$file     = Q2_PATH . 'includes/' . $relative . '.php';
		if ( is_readable( $file ) ) {
			require_once $file;
		}
	}
);

add_action(
	'plugins_loaded',
	static function (): void {
		Q2\Core\Plugin::instance()->boot();
	}
);

register_activation_hook(
	__FILE__,
	static function (): void {
		Q2\Application\Application::register_rewrite_rules();
		Q2\Core\Capabilities::activate();
		flush_rewrite_rules();
	}
);

register_deactivation_hook( __FILE__, 'flush_rewrite_rules' );
