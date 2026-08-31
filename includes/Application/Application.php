<?php
/**
 * Theme-independent Q2 application boundary.
 *
 * @package Q2
 */

declare( strict_types=1 );

namespace Q2\Application;

defined( 'ABSPATH' ) || exit;

use Q2\Core\Capabilities;

/**
 * Serves and bootstraps the private, theme-independent application document.
 */
final class Application {
	private const QUERY_VAR     = 'q2_app';
	private const SCRIPT_HANDLE = 'q2-app';

	/**
	 * Registers routing, access, template, and asset hooks.
	 */
	public function register(): void {
		add_action( 'init', array( self::class, 'register_rewrite_rules' ) );
		add_filter( 'query_vars', array( $this, 'register_query_var' ) );
		add_action( 'wp', array( $this, 'isolate_assets' ) );
		add_action( 'template_redirect', array( $this, 'enforce_access' ), 1 );
		add_filter( 'template_include', array( $this, 'select_template' ), PHP_INT_MAX );
		add_action( 'wp_enqueue_scripts', array( $this, 'enqueue_assets' ) );
		add_filter( 'document_title_parts', array( $this, 'document_title' ) );
	}

	/**
	 * Registers the application root and all nested client routes.
	 */
	public static function register_rewrite_rules(): void {
		add_rewrite_rule( '^$', 'index.php?' . self::QUERY_VAR . '=1', 'top' );
		add_rewrite_rule( '^q2(?:/.*)?/?$', 'index.php?' . self::QUERY_VAR . '=1', 'top' );
	}

	/**
	 * Adds Q2's application flag to public query variables.
	 *
	 * @param string[] $vars Public query variables.
	 * @return string[]
	 */
	public function register_query_var( array $vars ): array {
		$vars[] = self::QUERY_VAR;
		return $vars;
	}

	/**
	 * Determines whether the current request targets the Q2 application.
	 */
	public function is_request(): bool {
		return '1' === (string) get_query_var( self::QUERY_VAR ) || is_front_page();
	}

	/**
	 * Enforces login and read access and marks the application response private.
	 */
	public function enforce_access(): void {
		if ( ! $this->is_request() ) {
			return;
		}

		if ( ! is_user_logged_in() ) {
			auth_redirect();
		}

		if ( ! current_user_can( 'read' ) ) {
			wp_die(
				esc_html__( 'You do not have permission to access Q2.', 'q2' ),
				esc_html__( 'Q2 access denied', 'q2' ),
				array( 'response' => 403 )
			);
		}

		global $wp_query;
		$wp_query->is_404 = false;
		status_header( 200 );
		nocache_headers();
		header( 'X-Robots-Tag: noindex, nofollow', true );
		show_admin_bar( false );
	}

	/**
	 * Keep theme and unrelated front-end assets out of the application document.
	 */
	public function isolate_assets(): void {
		if ( ! $this->is_request() ) {
			return;
		}

		remove_all_actions( 'wp_enqueue_scripts' );
		add_action( 'wp_enqueue_scripts', array( $this, 'enqueue_assets' ) );
	}

	/**
	 * Selects Q2's application document instead of an active-theme template.
	 *
	 * @param string $template Template selected by WordPress.
	 */
	public function select_template( string $template ): string {
		if ( ! $this->is_request() ) {
			return $template;
		}

		return Q2_PATH . 'templates/application.php';
	}

	/**
	 * Sets a stable application document title.
	 *
	 * @param array<string, string> $parts Title components.
	 * @return array<string, string>
	 */
	public function document_title( array $parts ): array {
		if ( $this->is_request() ) {
			$parts['title'] = __( 'Q2 Workspace', 'q2' );
		}
		return $parts;
	}

	/**
	 * Enqueues the extracted application bundle and bootstrap settings.
	 */
	public function enqueue_assets(): void {
		if ( ! $this->is_request() ) {
			return;
		}

		$asset_file = Q2_PATH . 'build/index.asset.php';
		$asset      = file_exists( $asset_file ) ? require $asset_file : array(
			'dependencies' => array( 'wp-api-fetch', 'wp-blocks', 'wp-element', 'wp-i18n' ),
			'version'      => Q2_VERSION,
		);

		wp_enqueue_script(
			self::SCRIPT_HANDLE,
			Q2_URL . 'build/index.js',
			$asset['dependencies'],
			$asset['version'],
			true
		);
		wp_enqueue_style(
			self::SCRIPT_HANDLE,
			Q2_URL . 'build/style-index.css',
			array(),
			$asset['version']
		);

		wp_add_inline_script(
			self::SCRIPT_HANDLE,
			'window.q2Settings = ' . wp_json_encode( $this->client_settings() ) . ';',
			'before'
		);
		wp_set_script_translations( self::SCRIPT_HANDLE, 'q2' );
	}

	/**
	 * Builds the non-secret application bootstrap payload.
	 *
	 * @return array<string, mixed>
	 */
	private function client_settings(): array {
		$user = wp_get_current_user();

		return array(
			'appUrl'       => home_url( '/q2/' ),
			'homeUrl'      => home_url( '/' ),
			'restNonce'    => wp_create_nonce( 'wp_rest' ),
			'restRoot'     => esc_url_raw( rest_url() ),
			'siteName'     => get_bloginfo( 'name' ),
			'currentUser'  => array(
				'id'        => $user->ID,
				'name'      => $user->display_name,
				'avatarUrl' => get_avatar_url( $user->ID, array( 'size' => 64 ) ),
			),
			'capabilities' => array(
				'createPosts'  => current_user_can( 'edit_posts' ),
				'publishPosts' => current_user_can( 'publish_posts' ),
				'manageQ2'     => current_user_can( Capabilities::MANAGE ),
				'mentionAll'   => current_user_can( Capabilities::MENTION_ALL ),
			),
		);
	}
}
