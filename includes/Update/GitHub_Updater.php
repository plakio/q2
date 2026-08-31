<?php
/**
 * Public GitHub Releases updater.
 *
 * @package Q2
 */

declare( strict_types=1 );

namespace Q2\Update;

defined( 'ABSPATH' ) || exit;

/**
 * Integrates Q2 releases with WordPress's native plugin updater.
 */
final class GitHub_Updater {
	private const OWNER          = 'plakio';
	private const REPOSITORY     = 'q2';
	private const API_URL        = 'https://api.github.com/repos/plakio/q2/releases/latest';
	private const UPDATE_URI     = 'https://github.com/plakio/q2';
	private const CACHE_KEY      = 'q2_latest_github_release';
	private const CACHE_LIFETIME = HOUR_IN_SECONDS;

	/**
	 * Absolute path to the main plugin file.
	 *
	 * @var string
	 */
	private string $file;

	/**
	 * WordPress-relative plugin basename.
	 *
	 * @var string
	 */
	private string $plugin_file;

	/**
	 * Installed plugin directory name.
	 *
	 * @var string
	 */
	private string $plugin_directory;

	/**
	 * Installed version from the plugin header.
	 *
	 * @var string
	 */
	private string $version;

	/**
	 * Creates an updater for the given plugin entry file.
	 *
	 * @param string $file Absolute or resolvable main plugin file path.
	 */
	public function __construct( string $file ) {
		$resolved               = realpath( $file );
		$this->file             = false !== $resolved ? $resolved : wp_normalize_path( $file );
		$this->plugin_file      = plugin_basename( $this->file );
		$this->plugin_directory = dirname( $this->plugin_file );
		$data                   = get_file_data( $this->file, array( 'Version' => 'Version' ) );
		$this->version          = (string) ( $data['Version'] ?? '' );
	}

	/**
	 * Registers native WordPress update hooks.
	 */
	public function register(): void {
		add_filter( 'update_plugins_github.com', array( $this, 'check_update' ), 10, 3 );
		add_filter( 'plugins_api', array( $this, 'plugin_information' ), 10, 3 );
		add_filter( 'upgrader_install_package_result', array( $this, 'normalize_installed_directory' ), 10, 2 );
		add_filter( 'plugin_row_meta', array( $this, 'add_check_update_link' ), 10, 2 );
		add_action( 'admin_init', array( $this, 'handle_manual_update_check' ) );
		add_action( 'admin_notices', array( $this, 'render_manual_update_notice' ) );
	}

	/**
	 * Adds a manual update check to Q2's row on the Plugins screen.
	 *
	 * @param string[] $plugin_meta Existing plugin metadata links.
	 * @param string   $plugin_file Plugin basename for the current row.
	 * @return string[]
	 */
	public function add_check_update_link( array $plugin_meta, string $plugin_file ): array {
		if ( $plugin_file !== $this->plugin_file ) {
			return $plugin_meta;
		}

		$url           = wp_nonce_url(
			add_query_arg( 'q2_check_update', '1', admin_url( 'plugins.php' ) ),
			'q2_check_update'
		);
		$plugin_meta[] = '<a href="' . esc_url( $url ) . '">' . esc_html__( 'Check Update', 'q2' ) . '</a>';

		return $plugin_meta;
	}

	/**
	 * Forces WordPress and Q2 to fetch fresh update metadata.
	 */
	public function handle_manual_update_check(): void {
		if ( ! isset( $_GET['q2_check_update'] ) || ! current_user_can( 'update_plugins' ) ) {
			return;
		}

		$nonce = sanitize_text_field( wp_unslash( (string) ( $_GET['_wpnonce'] ?? '' ) ) );
		if ( '' === $nonce || ! wp_verify_nonce( $nonce, 'q2_check_update' ) ) {
			return;
		}

		delete_site_transient( self::CACHE_KEY );
		delete_site_transient( 'update_plugins' );
		wp_update_plugins();

		$referer  = wp_get_referer();
		$redirect = remove_query_arg(
			array( 'q2_check_update', '_wpnonce', 'q2_update_result' ),
			false !== $referer ? $referer : admin_url( 'plugins.php' )
		);
		wp_safe_redirect( add_query_arg( 'q2_update_result', '1', $redirect ) );
		exit;
	}

	/**
	 * Reports the result of a manual update check on the Plugins screen.
	 */
	public function render_manual_update_notice(): void {
		// This flag only selects a read-only notice after the nonce-protected redirect above.
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended
		if ( ! isset( $_GET['q2_update_result'] ) ) {
			return;
		}

		$screen = function_exists( 'get_current_screen' ) ? get_current_screen() : null;
		if ( ! $screen || 'plugins' !== $screen->id ) {
			return;
		}

		$transient = get_site_transient( 'update_plugins' );
		$latest    = '';
		if ( is_object( $transient ) && isset( $transient->response[ $this->plugin_file ]->new_version ) ) {
			$latest = (string) $transient->response[ $this->plugin_file ]->new_version;
		}

		if ( '' !== $latest ) {
			wp_admin_notice(
				sprintf(
					/* translators: %s: latest Q2 version. */
					esc_html__( 'Q2 %s is available. Use the “Update now” action to install it.', 'q2' ),
					esc_html( $latest )
				),
				array(
					'type'        => 'success',
					'dismissible' => true,
				)
			);
			return;
		}

		wp_admin_notice(
			esc_html__( 'Q2 is up to date.', 'q2' ),
			array(
				'type'        => 'info',
				'dismissible' => true,
			)
		);
	}

	/**
	 * Supplies an update when the latest public GitHub Release is newer.
	 *
	 * @param array<string, mixed>|false $update Existing update response.
	 * @param array<string, mixed>       $data   Installed plugin header data.
	 * @param string                     $file   Plugin basename being checked.
	 * @return array<string, mixed>|false
	 */
	public function check_update( array|false $update, array $data, string $file ): array|false {
		if ( $file !== $this->plugin_file || self::UPDATE_URI !== (string) ( $data['UpdateURI'] ?? '' ) ) {
			return $update;
		}

		$release = $this->get_latest_release();
		if ( null === $release || ! version_compare( $release['version'], $this->version, '>' ) ) {
			return $update;
		}

		return array(
			'id'           => self::UPDATE_URI,
			'slug'         => self::REPOSITORY,
			'plugin'       => $this->plugin_file,
			'version'      => $release['version'],
			'new_version'  => $release['version'],
			'url'          => self::UPDATE_URI,
			'package'      => $release['package'],
			'tested'       => $this->tested_wordpress_version(),
			'requires'     => '7.1',
			'requires_php' => '8.1',
		);
	}

	/**
	 * Supplies the modal shown by “View version details”.
	 *
	 * @param mixed  $result Existing Plugins API response.
	 * @param string $action Requested Plugins API action.
	 * @param object $args   Plugins API arguments.
	 * @return mixed
	 */
	public function plugin_information( mixed $result, string $action, object $args ): mixed {
		if ( 'plugin_information' !== $action || self::REPOSITORY !== (string) ( $args->slug ?? '' ) ) {
			return $result;
		}

		$release = $this->get_latest_release();
		if ( null === $release ) {
			return $result;
		}

		return (object) array(
			'name'          => 'Q2',
			'slug'          => self::REPOSITORY,
			'version'       => $release['version'],
			'author'        => 'Q2 contributors',
			'homepage'      => self::UPDATE_URI,
			'requires'      => '7.1',
			'requires_php'  => '8.1',
			'tested'        => $this->tested_wordpress_version(),
			'last_updated'  => $release['published_at'],
			'sections'      => array(
				'description' => __( 'A modern, self-hosted collaborative workspace for WordPress.', 'q2' ),
				'changelog'   => '' !== $release['notes'] ? wp_kses_post( nl2br( $release['notes'] ) ) : __( 'See the GitHub release for details.', 'q2' ),
			),
			'download_link' => $release['package'],
		);
	}

	/**
	 * Renames GitHub's extracted package directory back to `q2`.
	 *
	 * @param array<string, mixed> $result     Upgrader result.
	 * @param array<string, mixed> $hook_extra Upgrader context.
	 * @return array<string, mixed>
	 */
	public function normalize_installed_directory( array $result, array $hook_extra ): array {
		if ( ( $hook_extra['plugin'] ?? '' ) !== $this->plugin_file ) {
			return $result;
		}

		$destination       = (string) ( $result['destination'] ?? '' );
		$local_destination = (string) ( $result['local_destination'] ?? WP_PLUGIN_DIR );
		$target            = trailingslashit( $local_destination ) . $this->plugin_directory;
		if ( '' === $destination || $destination === $target || ! function_exists( 'move_dir' ) ) {
			return $result;
		}

		global $wp_filesystem;
		if ( $wp_filesystem && $wp_filesystem->exists( $target ) ) {
			$wp_filesystem->delete( $target, true );
		}

		$moved = move_dir( $destination, $target );
		if ( is_wp_error( $moved ) ) {
			return $result;
		}

		$result['destination']        = $target;
		$result['destination_name']   = $this->plugin_directory;
		$result['remote_destination'] = $target;
		return $result;
	}

	/**
	 * Gets and caches normalized public release metadata.
	 *
	 * @return array{version:string,package:string,published_at:string,notes:string}|null
	 */
	private function get_latest_release(): ?array {
		$cached = get_site_transient( self::CACHE_KEY );
		if ( is_array( $cached ) ) {
			return $cached;
		}

		$response = wp_remote_get(
			self::API_URL,
			array(
				'timeout' => 10,
				'headers' => array(
					'Accept'     => 'application/vnd.github+json',
					'User-Agent' => 'Q2-WordPress-Updater/' . $this->version,
				),
			)
		);
		if ( is_wp_error( $response ) || 200 !== wp_remote_retrieve_response_code( $response ) ) {
			return null;
		}

		$body = json_decode( wp_remote_retrieve_body( $response ), true );
		if ( ! is_array( $body ) || ! empty( $body['draft'] ) || ! empty( $body['prerelease'] ) ) {
			return null;
		}

		$version = ltrim( (string) ( $body['tag_name'] ?? '' ), 'v' );
		$package = $this->find_release_package( $body['assets'] ?? array(), $version );
		if ( ! preg_match( '/^\d+\.\d+\.\d+$/', $version ) || '' === $package ) {
			return null;
		}

		$release = array(
			'version'      => $version,
			'package'      => $package,
			'published_at' => sanitize_text_field( (string) ( $body['published_at'] ?? '' ) ),
			'notes'        => sanitize_textarea_field( (string) ( $body['body'] ?? '' ) ),
		);
		set_site_transient( self::CACHE_KEY, $release, self::CACHE_LIFETIME );
		return $release;
	}

	/**
	 * Finds the versioned Q2 ZIP in a release asset list.
	 *
	 * @param mixed  $assets  Untrusted GitHub asset data.
	 * @param string $version Normalized release version.
	 */
	private function find_release_package( mixed $assets, string $version ): string {
		if ( ! is_array( $assets ) ) {
			return '';
		}

		$expected = 'q2-' . $version . '.zip';
		foreach ( $assets as $asset ) {
			if ( is_array( $asset ) && ( $asset['name'] ?? '' ) === $expected ) {
				return esc_url_raw( (string) ( $asset['browser_download_url'] ?? '' ) );
			}
		}
		return '';
	}

	/**
	 * Returns the runtime WordPress version for update metadata.
	 */
	private function tested_wordpress_version(): string {
		global $wp_version;
		return is_string( $wp_version ) ? $wp_version : '';
	}
}
