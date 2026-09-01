<?php
/**
 * Standalone Q2 application document.
 *
 * @package Q2
 */

defined( 'ABSPATH' ) || exit;

do_action( 'wp_enqueue_scripts' );
?><!doctype html>
<html <?php language_attributes(); ?>>
<head>
	<meta charset="<?php bloginfo( 'charset' ); ?>">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<title><?php echo esc_html( wp_get_document_title() ); ?></title>
	<?php
	wp_site_icon();
	wp_print_styles();
	wp_print_head_scripts();
	?>
</head>
<body class="q2-document">
	<a class="q2-skip-link" href="#q2-main"><?php esc_html_e( 'Skip to workspace content', 'q2' ); ?></a>
	<div id="q2-root">
		<p class="q2-boot-status" role="status"><?php esc_html_e( 'Loading Q2…', 'q2' ); ?></p>
	</div>
	<noscript><p><?php esc_html_e( 'Q2 requires JavaScript for its application interface.', 'q2' ); ?></p></noscript>
	<?php
	if ( function_exists( 'wp_print_media_templates' ) ) {
		wp_print_media_templates();
	}
	?>
	<?php wp_print_footer_scripts(); ?>
</body>
</html>
