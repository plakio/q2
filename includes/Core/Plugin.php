<?php
/**
 * Main plugin coordinator.
 *
 * @package Q2
 */

declare( strict_types=1 );

namespace Q2\Core;

defined( 'ABSPATH' ) || exit;

use Q2\Application\Application;
use Q2\REST\Bootstrap_Controller;
use Q2\Update\GitHub_Updater;

/**
 * Coordinates the plugin's independently testable modules.
 */
final class Plugin {
	/**
	 * Shared plugin coordinator.
	 *
	 * @var self|null
	 */
	private static ?self $instance = null;

	/**
	 * Gets the plugin coordinator.
	 */
	public static function instance(): self {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}

		return self::$instance;
	}

	/**
	 * Registers Q2 modules after all plugins are loaded.
	 */
	public function boot(): void {
		( new Application() )->register();
		( new Bootstrap_Controller() )->register();
		( new GitHub_Updater( Q2_PATH . 'q2.php' ) )->register();
		add_action( 'init', array( $this, 'load_textdomain' ) );
	}

	/**
	 * Loads translations from the standard plugin language directory.
	 */
	public function load_textdomain(): void {
		load_plugin_textdomain( 'q2', false, dirname( plugin_basename( Q2_PATH . 'q2.php' ) ) . '/languages' );
	}
}
