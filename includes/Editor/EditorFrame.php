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
		add_action( 'admin_init', array( $this, 'allow_iframe_request' ), 0 );
		add_action( 'admin_init', array( $this, 'maybe_strip_chrome' ) );
		add_action( 'admin_head', array( $this, 'print_embed_styles' ) );
		add_action( 'admin_print_footer_scripts', array( $this, 'print_bridge_script' ) );
		add_action( 'enqueue_block_editor_assets', array( $this, 'enqueue_editor_assets' ) );
		add_filter( 'admin_body_class', array( $this, 'add_body_class' ) );
		add_action( 'rest_api_init', array( $this, 'register_rest_routes' ) );
		add_filter( 'wp_insert_post_data', array( $this, 'derive_post_title_from_content' ), 10, 2 );
	}

	/**
	 * When a post is saved without a title (the Q2 P2 editor hides the
	 * title field), derive a short title from the first paragraph of
	 * content so listings, feeds, and notifications have a label.
	 *
	 * @param array $data    Sanitized post data.
	 * @param array $postarr Raw post array.
	 * @return array
	 */
	public function derive_post_title_from_content( array $data, array $postarr ): array {
		if ( isset( $postarr['post_type'] ) && 'post' !== $postarr['post_type'] ) {
			return $data;
		}

		if ( isset( $postarr['post_status'] ) && in_array( $postarr['post_status'], array( 'auto-draft', 'trash' ), true ) ) {
			return $data;
		}

		if ( '' !== trim( (string) $data['post_title'] ) ) {
			return $data;
		}

		// P2 behaviour: the first line of the update becomes the post title
		// and is removed from the content so the feed never renders it twice.
		$blocks      = parse_blocks( (string) $data['post_content'] );
		$first_index = null;
		foreach ( $blocks as $index => $block ) {
			if ( empty( $block['blockName'] ) && '' === trim( (string) ( $block['innerHTML'] ?? '' ) ) ) {
				continue;
			}
			$first_index = $index;
			break;
		}

		if ( null === $first_index ) {
			return $data;
		}

		$first = $blocks[ $first_index ];
		$text  = trim( wp_strip_all_tags( (string) ( $first['innerHTML'] ?? '' ) ) );

		if ( '' === $text ) {
			$text = trim(
				wp_strip_all_tags(
					(string) implode(
						'',
						array_map(
							static function ( $inner ) {
								return $inner['innerHTML'] ?? '';
							},
							(array) ( $first['innerBlocks'] ?? array() )
						)
					)
				)
			);
		}

		if ( '' === $text ) {
			return $data;
		}

		$title = $text;
		if ( function_exists( 'mb_strlen' ) && function_exists( 'mb_substr' ) ) {
			if ( mb_strlen( $title ) > 80 ) {
				$title = mb_substr( $title, 0, 80 ) . '…';
			}
		} elseif ( strlen( $title ) > 80 ) {
			$title = substr( $title, 0, 80 ) . '…';
		}

		$data['post_title'] = $title;

		if ( 'core/paragraph' === $first['blockName'] || 'core/heading' === $first['blockName'] ) {
			array_splice( $blocks, $first_index, 1 );
			$data['post_content'] = serialize_blocks( $blocks );
		}

		return $data;
	}

	/**
	 * Removes Core's frame denial only for a valid, same-site Q2 editor URL.
	 */
	public function allow_iframe_request(): void {
		if ( ! $this->is_embed_request() ) {
			return;
		}

		// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- verified immediately below.
		$nonce = isset( $_GET['_wpnonce'] ) ? sanitize_text_field( wp_unslash( $_GET['_wpnonce'] ) ) : '';
		if ( ! wp_verify_nonce( $nonce, 'q2-embed' ) ) {
			return;
		}

		remove_action( 'admin_init', 'send_frame_options_header', 10 );
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
	 * Returns the requested Q2 editor presentation.
	 */
	private function embed_mode(): string {
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- presentation-only flag.
		$mode = isset( $_GET['q2_mode'] ) ? sanitize_key( wp_unslash( $_GET['q2_mode'] ) ) : 'embedded';
		return in_array( $mode, array( 'inline', 'full', 'embedded', 'p2' ), true ) ? $mode : 'embedded';
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

		$inline = 'inline' === $this->embed_mode();
		$p2     = 'p2' === $this->embed_mode();

		$css = '#wpadminbar,#adminmenuback,#adminmenuwrap,#wpfooter,.update-plugins,.notice,.error,.updated{display:none!important;}'
			. 'html.wp-toolbar{padding-top:0!important;}'
			. 'body.q2-embed{margin:0!important;background:#fff!important;}'
			. '#wpcontent,#wpbody-content{margin-left:0!important;padding:0!important;}'
			. '.edit-post-header,.edit-post-layout__header{position:sticky;top:0;z-index:30;}';

		if ( $inline ) {
			$css .= '.editor-post-title,.editor-post-title__block,.editor-visual-editor__post-title-wrapper,.edit-post-sidebar,.interface-interface-skeleton__sidebar,.editor-post-publish-panel{display:none!important;}'
				. '.interface-interface-skeleton__content{background:#fff!important;}.editor-styles-wrapper{padding-top:24px!important;}';
		}

		if ( $p2 ) {
			$css .= '.q2-embed-p2 .editor-visual-editor__post-title-wrapper,.q2-embed-p2 .edit-post-fullscreen-mode-close,.q2-embed-p2 .edit-post-header__settings .editor-post-toggle-fullscreen-mode,.q2-embed-p2 .editor-post-publish-button,.q2-embed-p2 .editor-post-save-draft{display:none!important;}'
				. '.q2-embed-p2 .edit-post-header{border-bottom:1px solid #e0e0e0;box-shadow:none;height:60px;padding:0 1rem;background:#fff;}'
				. '.q2-embed-p2 .edit-post-header__toolbar .components-button{color:#1e1e1e;}'
				. '.q2-embed-p2 .interface-interface-skeleton__content{background:#fff!important;}'
				. '.q2-embed-p2 .edit-post-visual-editor__post-title-wrapper,.q2-embed-p2 .editor-styles-wrapper{max-width:720px!important;margin:0 auto!important;padding:2rem 1.5rem!important;}'
				. '.q2-embed-p2 .editor-styles-wrapper .block-editor-block-list__layout{min-height:180px;}'
				. '.q2-embed-p2 .block-editor-writing-flow{display:block!important;}'
				. '.q2-embed-p2 .edit-post-sidebar,.q2-embed-p2 .interface-interface-skeleton__sidebar{display:none!important;}'
				. '.q2-embed-p2 .q2-display-options{display:flex;align-items:center;justify-content:flex-end;padding:1rem 2rem;gap:0.5rem;max-width:760px;margin:0 auto;border-top:1px solid #e0e0e0;}'
				. '.q2-embed-p2 .q2-display-options-toggle{font-size:0.85rem;color:#757575;background:none;border:none;cursor:pointer;display:inline-flex;align-items:center;gap:0.4rem;}'
				. '.q2-embed-p2 .q2-display-options-toggle:hover{color:#1e1e1e;}'
				. '.q2-embed-p2 .q2-display-options-body{display:none;padding:1.5rem 2rem;max-width:760px;margin:0 auto;}'
				. '.q2-embed-p2.q2-display-options-open .q2-display-options-body{display:block;}'
				. '.q2-embed-p2 .q2-display-options-body .editor-post-format,.q2-embed-p2 .q2-display-options-body .edit-post-header__settings{display:none!important;}'
				. '.q2-embed-p2 .q2-display-options-body .components-panel__body{border-top:1px solid #e0e0e0;}'
				. '.q2-embed-p2 .q2-display-options-body .components-panel__body-title{padding:0.5rem 0;}';
		}

		echo '<style id="q2-embed-shell">' . $css . '</style>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- static CSS above.
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
			$classes .= ' q2-embed q2-embed-' . $this->embed_mode();
		}
		return $classes;
	}

	/**
	 * Registers Q2 blocks and mention completion in the native editor.
	 */
	public function enqueue_editor_assets(): void {
		$asset_file = Q2_PATH . 'build/index.asset.php';
		$asset      = file_exists( $asset_file ) ? require $asset_file : array(
			'dependencies' => array( 'wp-blocks', 'wp-element', 'wp-i18n' ),
			'version'      => Q2_VERSION,
		);

		wp_enqueue_script(
			'q2-editor-blocks',
			Q2_URL . 'build/index.js',
			$asset['dependencies'],
			$asset['version'],
			true
		);
		wp_add_inline_script(
			'q2-editor-blocks',
			'window.q2Settings = window.q2Settings || ' . wp_json_encode(
				array(
					'restNonce'   => wp_create_nonce( 'wp_rest' ),
					'restRoot'    => esc_url_raw( rest_url() ),
					'currentUser' => array( 'id' => get_current_user_id() ),
				)
			) . ';',
			'before'
		);
	}

	/**
	 * Prints the JavaScript bridge that posts save and close events to
	 * the parent Q2 window.
	 */
	public function print_bridge_script(): void {
		if ( ! $this->is_embed_request() ) {
			return;
		}

		$p2 = 'p2' === $this->embed_mode();

		?>
<script id="q2-embed-bridge">
(function(){
	if (window.parent === window) { return; }
	var wasSaving = false;
	function post(type, detail) {
		var editor = window.wp && wp.data ? wp.data.select('core/editor') : null;
		var postId = editor && editor.getCurrentPostId ? editor.getCurrentPostId() : 0;
		window.parent.postMessage(Object.assign({ source: 'q2-embed', postId: postId || 0, type: type }, detail || {}), window.location.origin);
	}
	function connect() {
		if (!window.wp || !wp.data || !wp.data.select('core/editor')) {
			window.setTimeout(connect, 50);
			return;
		}
		wp.data.subscribe(function(){
			var editor = wp.data.select('core/editor');
			var saving = editor.isSavingPost() && !editor.isAutosavingPost();
			if (saving && !wasSaving) { post('save:requested'); }
			if (!saving && wasSaving && editor.didPostSaveRequestSucceed()) { post('save:done'); }
			wasSaving = saving;
		});
		post('ready');
		<?php if ( $p2 ) : ?>
		mountDisplayOptions();
		<?php endif; ?>
	}
		<?php if ( $p2 ) : ?>
	function mountDisplayOptions() {
		var skeleton = document.querySelector('.interface-interface-skeleton__content');
		if (!skeleton || document.querySelector('.q2-display-options')) {
			window.setTimeout(mountDisplayOptions, 200);
			return;
		}
		var wrap = document.createElement('div');
		wrap.className = 'q2-display-options';
		wrap.innerHTML = '<button type="button" class="q2-display-options-toggle" aria-expanded="false">' +
			'<span>Display options</span><span aria-hidden="true">▾</span></button>';
		skeleton.appendChild(wrap);
		wrap.addEventListener('click', function(event){
			if (!event.target.closest('.q2-display-options-toggle')) { return; }
			var open = document.body.classList.toggle('q2-display-options-open');
			event.currentTarget.setAttribute('aria-expanded', open ? 'true' : 'false');
			var settings = document.querySelector('.edit-post-header__settings .components-button[aria-label]');
			var toggle = document.querySelector('button[aria-label="Settings"], .edit-post-header__settings button');
			if (toggle && toggle.click && !open) { /* keep sidebar closed */ }
		});
	}
		<?php endif; ?>
	document.addEventListener('click', function(event) {
		var target = event.target.closest && event.target.closest('.edit-post-fullscreen-mode-close, a[href*="edit.php"]');
		if (target) {
			event.preventDefault();
			post('close:requested');
		}
	}, true);
	document.addEventListener('keydown', function(event) {
		if (event.key === 'Escape' && (document.body.classList.contains('q2-embed-full') || document.body.classList.contains('q2-embed-p2'))) {
			post('close:requested');
		}
	});
	connect();
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
					'mode'      => array(
						'required'          => false,
						'type'              => 'string',
						'sanitize_callback' => 'sanitize_key',
						'default'           => 'embedded',
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

		$type_object = get_post_type_object( $post_type );
		return $type_object && current_user_can( $type_object->cap->create_posts );
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
		$mode      = (string) $request->get_param( 'mode' );

		if ( $post_id > 0 ) {
			return new \WP_REST_Response(
				array( 'url' => add_query_arg( 'q2_mode', $mode, self::editor_url( $post_id ) ) )
			);
		}

		$nonce = wp_create_nonce( 'q2-embed' );
		$url   = add_query_arg(
			array(
				'post_type'      => $post_type,
				self::QUERY_FLAG => '1',
				'q2_mode'        => $mode,
				'_wpnonce'       => $nonce,
			),
			admin_url( 'post-new.php' )
		);

		return new \WP_REST_Response( array( 'url' => $url ) );
	}
}
