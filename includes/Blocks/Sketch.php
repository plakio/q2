<?php
/**
 * Interoperability for the Sketch drawing blocks.
 *
 * @package Q2
 */

declare( strict_types=1 );

namespace Q2\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Keeps pre-fork a8c/sketch content working and migrates it to q2/sketch.
 */
final class Sketch {
	/**
	 * Wires the block styles, fallback renderer, and migration command.
	 */
	public static function register(): void {
		add_action( 'init', array( __CLASS__, 'register_assets' ), 5 );
		add_action( 'init', array( __CLASS__, 'register_fallback' ), 20 );
		if ( defined( 'WP_CLI' ) && WP_CLI ) {
			\WP_CLI::add_command( 'q2 migrate-sketch', array( __CLASS__, 'cli_migrate' ) );
		}
	}

	/**
	 * Registers the block stylesheet handle.
	 *
	 * The canvas styles ship as the block's own stylesheet so they load
	 * wherever the block renders: the workspace, the embedded wp-admin
	 * editor, and the front end.
	 */
	public static function register_assets(): void {
		wp_register_style(
			'q2-sketch',
			Q2_URL . 'assets/sketch.css',
			array(),
			Q2_VERSION
		);
	}

	/**
	 * Renders legacy a8c/sketch blocks when their plugin is inactive.
	 *
	 * Skipped entirely while the original plugin is active so it keeps
	 * owning its block type.
	 */
	public static function register_fallback(): void {
		$registry = \WP_Block_Type_Registry::get_instance();
		if ( ! $registry->is_registered( 'q2/sketch' ) ) {
			register_block_type(
				'q2/sketch',
				array(
					'render_callback' => array( __CLASS__, 'render_sketch' ),
					'style'           => 'q2-sketch',
					'supports'        => array( 'align' => true ),
				)
			);
		}
		if ( ! $registry->is_registered( 'a8c/sketch' ) ) {
			register_block_type(
				'a8c/sketch',
				array(
					'render_callback' => array( __CLASS__, 'render_sketch' ),
					'style'           => 'q2-sketch',
					'supports'        => array( 'align' => true ),
				)
			);
		}
	}

	/**
	 * Renders a sketch from its stored strokes.
	 *
	 * Shared by q2/sketch and the a8c/sketch fallback.
	 *
	 * @param array<string, mixed> $attributes Block attributes.
	 */
	public static function render_sketch( array $attributes ): string {
		$strokes = $attributes['strokes'] ?? array();
		$title   = $attributes['title'] ?? '';
		$height  = isset( $attributes['height'] ) ? (int) $attributes['height'] : 450;

		if ( ! is_array( $strokes ) || array() === $strokes ) {
			return '';
		}

		$paths = array();
		foreach ( $strokes as $stroke ) {
			if ( ! is_array( $stroke ) || empty( $stroke['stroke'] ) || empty( $stroke['color'] ) ) {
				continue;
			}
			$paths[] = sprintf(
				'<path fill="%s" d="%s" />',
				esc_attr( (string) $stroke['color'] ),
				esc_attr( self::svg_path_from_stroke( (array) $stroke['stroke'] ) )
			);
		}

		if ( array() === $paths ) {
			return '';
		}

		$title_tag = '' !== $title ? sprintf( '<title>%s</title>', esc_html( (string) $title ) ) : '';

		return sprintf(
			'<figure %s style="height: %dpx;"><svg role="img">%s%s</svg></figure>',
			get_block_wrapper_attributes(),
			$height,
			$title_tag,
			implode( "\n", $paths )
		);
	}

	/**
	 * Builds SVG path data from perfect-freehand outline points.
	 *
	 * @param array<int, mixed> $stroke Outline points.
	 */
	public static function svg_path_from_stroke( array $stroke ): string {
		$count = count( $stroke );
		if ( $count < 4 ) {
			return '';
		}

		$point = static function ( $mark ): array {
			$mark = (array) $mark;
			return array( (float) ( $mark[0] ?? 0 ), (float) ( $mark[1] ?? 0 ) );
		};

		$p0 = $point( $stroke[0] );
		$p1 = $point( $stroke[1] );
		$p2 = $point( $stroke[2] );

		$d = sprintf(
			'M%s,%s Q%s,%s %s,%s T',
			self::num( $p0[0] ),
			self::num( $p0[1] ),
			self::num( $p1[0] ),
			self::num( $p1[1] ),
			self::num( ( $p1[0] + $p2[0] ) / 2 ),
			self::num( ( $p1[1] + $p2[1] ) / 2 )
		);

		for ( $i = 2; $i < $count - 1; $i++ ) {
			$a  = $point( $stroke[ $i ] );
			$b  = $point( $stroke[ $i + 1 ] );
			$d .= sprintf(
				'%s,%s ',
				self::num( ( $a[0] + $b[0] ) / 2 ),
				self::num( ( $a[1] + $b[1] ) / 2 )
			);
		}

		return $d . 'Z';
	}

	/**
	 * Formats a coordinate like the JavaScript port.
	 *
	 * @param float $value Coordinate value.
	 */
	private static function num( float $value ): string {
		return number_format( $value, 2, '.', '' );
	}

	/**
	 * Rewrites stored a8c/sketch blocks to q2/sketch in place.
	 *
	 * Both types share the same attribute model, so the migration only
	 * renames the block delimiters.
	 *
	 * ## OPTIONS
	 *
	 * [--dry-run]
	 * : Report how many posts would change without updating anything.
	 *
	 * @param string[]             $args  Positional arguments (unused).
	 * @param array<string, mixed> $assoc Associative arguments.
	 */
	public static function cli_migrate( array $args, array $assoc ): void { // phpcs:ignore Generic.CodeAnalysis.UnusedFunctionParameter.Found -- Required by WP-CLI signature.
		$dry_run = isset( $assoc['dry-run'] );
		$ids     = get_posts(
			array(
				'post_type'      => array( 'post', 'page' ),
				'post_status'    => 'any',
				'posts_per_page' => -1,
				's'              => 'wp:a8c/sketch',
				'fields'         => 'ids',
			)
		);

		$changed = 0;
		foreach ( $ids as $id ) {
			$post = get_post( (int) $id );
			if ( ! $post instanceof \WP_Post ) {
				continue;
			}
			$next = str_replace(
				array( '<!-- wp:a8c/sketch', '<!-- /wp:a8c/sketch -->' ),
				array( '<!-- wp:q2/sketch', '<!-- /wp:q2/sketch -->' ),
				$post->post_content
			);
			if ( $next === $post->post_content ) {
				continue;
			}
			++$changed;
			if ( ! $dry_run ) {
				wp_update_post(
					array(
						'ID'           => $post->ID,
						'post_content' => $next,
					)
				);
			}
		}

		if ( $dry_run ) {
			\WP_CLI::log(
				sprintf(
					/* translators: %d: number of posts. */
					__( '%d post(s) contain a8c/sketch blocks.', 'q2' ),
					$changed
				)
			);
			return;
		}

		\WP_CLI::success(
			sprintf(
				/* translators: %d: number of posts. */
				__( 'Migrated %d post(s) to q2/sketch.', 'q2' ),
				$changed
			)
		);
	}
}
