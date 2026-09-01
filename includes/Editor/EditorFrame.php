<?php
/**
 * Embedded post editor frame integration.
 *
 * @package Q2
 */

declare( strict_types=1 );

namespace Q2\Editor;

defined( 'ABSPATH' ) || exit;

/**
 * Hosts the WordPress block editor inside an iframe when Q2 embeds it.
 *
 * The embedded editor reuses the stock wp-admin post.php screen so the
 * fixed toolbar, sidebar, and all native Gutenberg controls render
 * exactly as in the WordPress admin. Q2 only strips the surrounding
 * chrome and wires a postMessage bridge for save and close events.
 */
final class EditorFrame {
	private const QUERY_FLAG = 'q2_embed';

	/**
	 * Wires the admin chrome stripping and the postMessage bridge.
	 */
	public function register(): void {
		add_action( 'admin_init', array( $this, 'maybe_strip_chrome' ) );
		add_action( 'admin_head', array( $this, 'print_embed_styles' ) );
		add_action( 'admin_print_footer_scripts', array( $this, 'print_bridge_script' ) );
		add_filter( 'wp_iframe_transport_send_headers', array( $this, 'allow_iframe_embedding' ) );
		add_filter( 'admin_body_class', array( $this, 'add_body_class' ) );
		add_action( 'rest_api_init', array( $this, 'register_rest_routes' ) );
	}

	/**
	 * Determines whether the current admin request is a Q2 embed.
	 */
	private function is_embed_request(): bool {
		if ( ! is_admin() ) {
			return false;
		}

		// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- read-only flag.
		if ( ! empty( $_GET[ self::QUERY_FLAG ] ) ) {
			return true;
		}

		return false;
	}

	/**
	 * Removes the admin chrome that should not appear inside Q2.
	 */
	public function maybe_strip_chrome(): void {
		if ( ! $this->is_embed_request() ) {
			return;
		}

		// Show the admin bar inside wp-admin but tell the iframe bridge
		// we still want a clean canvas. The shell is hidden with CSS.
		add_action( 'admin_enqueue_scripts', array( $this, 'hide_admin_shell' ), 20 );
	}

	/**
	 * Outputs inline CSS that hides the wp-admin shell so only the
	 * Gutenberg editor canvas remains visible inside the iframe.
	 */
	public function print_embed_styles(): void {
		if ( ! $this->is_embed_request() ) {
			return;
		}

		echo '<style id="q2-embed-shell">'
			. '#wpadminbar,#adminmenuback,#adminmenuwrap,#wpfooter,.update-plugins,.notice,.error,.updated{display:none!important;}'
			. 'html.wp-toolbar{padding-top:0!important;}'
			. 'body{q2-embed-body;margin:0!important;background:#fff!important;}'
			. '#wpcontent,#wpbody-content{margin-left:0!important;padding:0!important;}'
			. '.edit-post-header,.edit-post-layout__header{position:sticky;top:0;z-index:30;}'
			. '</style>';
	}

	/**
	 * Enqueues a script that hides the admin shell immediately on load
	 * to avoid a flash of admin chrome before the head style applies.
	 */
	public function hide_admin_shell(): void {
		if ( ! $this->is_embed_request() ) {
			return;
		}

		wp_add_inline_style(
			'common',
			'#wpadminbar,#adminmenuback,#adminmenuwrap,#wpfooter{display:none!important;}'
		);
	}

	/**
	 * Adds a body class so theme-specific CSS can scope Q2 embed rules.
	 *
	 * @param string $classes Existing body classes.
	 * @return string
	 */
	public function add_body_class( string $classes ): string {
		if ( $this->is_embed_request() ) {
			$classes .= ' q2-embed';
		}
		return $classes;
	}

	/**
	 * Allows Q2's frontend to embed the admin post screen in an iframe
	 * by overriding the X-Frame-Options denier on this specific screen.
	 *
	 * The check uses the same origin as the admin, so this only enables
	 * framing from the same WordPress site that hosts Q2.
	 *
	 * @param bool $send Whether to send the X-Frame-Options header.
	 * @return bool
	 */
	public function allow_iframe_embedding( bool $send ): bool {
		if ( ! $this->is_embed_request() ) {
			return $send;
		}

		// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- read-only flag.
		$nonce = isset( $_GET['_wpnonce'] ) ? sanitize_text_field( wp_unslash( $_GET['_wpnonce'] ) ) : '';
		if ( '' !== $nonce && ! wp_verify_nonce( $nonce, 'q2-embed' ) ) {
			return $send;
		}

		return false;
	}

	/**
	 * Prints the JavaScript bridge that posts save and close events to
	 * the parent Q2 window.
	 */
	public function print_bridge_script(): void {
		if ( ! $this->is_embed_request() ) {
			return;
		}

		// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- read-only flag passed through.
		$post_id = isset( $_GET['post'] ) ? absint( $_GET['post'] ) : 0;
		?>
<script id="q2-embed-bridge">
(function(){
	if (window.parent === window) { return; }
	function post(type, detail) {
		window.parent.postMessage(Object.assign({ source: 'q2-embed', postId: <?php echo (int) $post_id; ?>, type: type }, detail || {}), window.location.origin);
	}
	document.addEventListener('click', function(event){
		var target = event.target;
		while (target && target !== document) {
			if (target.matches && target.matches('.editor-post-publish-button, .editor-post-publish-panel__toggle, .editor-post-save-draft')) {
				post('save:requested');
				return;
			}
			if (target.classList && (target.classList.contains('editor-post-publish-panel__header-cancel') || target.classList.contains('edit-post-header-toolbar__left') && target.closest && target.closest('.components-modal__header'))) {
				post('close:requested');
				return;
			}
			target = target.parentNode;
		}
	}, true);
	var observer = new MutationObserver(function(){
		var saved = document.querySelector('.editor-post-saved-state.is-saved');
		if (saved) { post('save:done'); observer.disconnect(); }
	});
	observer.observe(document.body, { childList: true, subtree: true });
	post('ready');
})();
</script>
		<?php
	}

	/**
	 * Builds the URL the iframe should load for a given post.
	 *
	 * @param int $post_id The post to edit.
	 * @return string
	 */
	public static function editor_url( int $post_id ): string {
		$nonce = wp_create_nonce( 'q2-embed' );
		return add_query_arg(
			array(
				self::QUERY_FLAG => '1',
				'_wpnonce'       => $nonce,
			),
			admin_url( 'post.php?post=' . $post_id . '&action=edit' )
		);
	}

	/**
	 * Builds the URL for the "new post" admin screen.
	 *
	 * @return string
	 */
	public static function new_post_url(): string {
		$nonce = wp_create_nonce( 'q2-embed' );
		return add_query_arg(
			array(
				'post_type'      => 'post',
				self::QUERY_FLAG => '1',
				'_wpnonce'       => $nonce,
			),
			admin_url( 'post-new.php' )
		);
	}

	/**
	 * Registers the REST route the JS component calls to fetch a
	 * fresh, nonce-signed editor URL.
	 */
	public function register_rest_routes(): void {
		register_rest_route(
			'q2/v1',
			'/editor-url',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'rest_editor_url' ),
				'permission_callback' => array( $this, 'rest_can_embed' ),
				'args'                => array(
					'post_id'   => array(
						'required'          => false,
						'type'              => 'integer',
						'sanitize_callback' => 'absint',
					),
					'post_type' => array(
						'required'          => false,
						'type'              => 'string',
						'sanitize_callback' => 'sanitize_key',
						'default'           => 'post',
					),
				),
			)
		);
	}

	/**
	 * Gates the embed URL endpoint to users who can edit the post.
	 *
	 * @param \WP_REST_Request $request Incoming request.
	 * @return bool
	 */
	public function rest_can_embed( \WP_REST_Request $request ): bool {
		$post_id   = (int) $request->get_param( 'post_id' );
		$post_type = (string) $request->get_param( 'post_type' );

		if ( $post_id > 0 ) {
			return current_user_can( 'edit_post', $post_id );
		}

		return current_user_can( 'edit_posts' ) &&
			post_type_exists( $post_type ) &&
			current_user_can( 'edit_' . $post_type . 's' );
	}

	/**
	 * Returns the signed editor URL for the requested post.
	 *
	 * @param \WP_REST_Request $request Incoming request.
	 * @return \WP_REST_Response
	 */
	public function rest_editor_url( \WP_REST_Request $request ): \WP_REST_Response {
		$post_id   = (int) $request->get_param( 'post_id' );
		$post_type = (string) $request->get_param( 'post_type' );

		if ( $post_id > 0 ) {
			return new \WP_REST_Response(
				array( 'url' => self::editor_url( $post_id ) )
			);
		}

		$nonce = wp_create_nonce( 'q2-embed' );
		$url   = add_query_arg(
			array(
				'post_type'      => $post_type,
				self::QUERY_FLAG => '1',
				'_wpnonce'       => $nonce,
			),
			admin_url( 'post-new.php' )
		);

		return new \WP_REST_Response( array( 'url' => $url ) );
	}
}
