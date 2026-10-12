<?php
/**
 * SVG uploads for the media library.
 *
 * @package Q2
 */

declare( strict_types=1 );

namespace Q2\Media;

defined( 'ABSPATH' ) || exit;

/**
 * Lets trusted roles upload SVG files, sanitized on the way in.
 *
 * WordPress blocks SVG uploads by default because they are XML
 * documents that can carry scripts. Q2 enables them for users who can
 * upload files (authors, editors, administrators) and strips anything
 * executable before the file is stored.
 */
final class SVG {
	/**
	 * Hooks the upload pipeline.
	 */
	public static function register(): void {
		add_filter( 'upload_mimes', array( __CLASS__, 'allow_mime' ) );
		add_filter( 'wp_check_filetype_and_ext', array( __CLASS__, 'fix_filetype' ), 10, 5 );
		add_filter( 'wp_handle_upload_prefilter', array( __CLASS__, 'sanitize_upload' ) );
		add_filter( 'wp_handle_sideload_prefilter', array( __CLASS__, 'sanitize_upload' ) );
		add_filter( 'wp_generate_attachment_metadata', array( __CLASS__, 'add_dimensions' ), 10, 2 );
		add_filter( 'wp_prepare_attachment_for_js', array( __CLASS__, 'prepare_attachment' ), 10, 3 );
	}

	/**
	 * Adds the SVG mime type for users who can upload files.
	 *
	 * @param array<string, string> $mimes Allowed mime types.
	 * @return array<string, string>
	 */
	public static function allow_mime( array $mimes ): array {
		if ( self::can_upload_svg() ) {
			$mimes['svg'] = 'image/svg+xml';
		}
		return $mimes;
	}

	/**
	 * Lets SVG files pass core's content-based type check.
	 *
	 * Core cannot verify SVG with getimagesize, so without this the
	 * upload is rejected even though the mime is allowed.
	 *
	 * @param array<string, mixed> $data      File data (ext, type, proper_filename).
	 * @param string               $file      Full path to the temporary file.
	 * @param string               $filename  The file name.
	 * @param string[]|null        $mimes     Allowed mime types.
	 * @param string|false         $real_mime Real mime type, if detected.
	 * @return array<string, mixed>
	 */
	public static function fix_filetype( array $data, string $file, string $filename, ?array $mimes, $real_mime ): array { // phpcs:ignore Generic.CodeAnalysis.UnusedFunctionParameter.FoundAfterLastUsed -- Signature required by the filter.
		if ( 'svg' !== strtolower( pathinfo( $filename, PATHINFO_EXTENSION ) ) ) {
			return $data;
		}
		if ( ! self::can_upload_svg() ) {
			return $data;
		}

		$contents = is_readable( $file ) ? (string) file_get_contents( $file ) : ''; // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- Local file read.
		if ( ! self::looks_like_svg( $contents ) ) {
			return $data;
		}

		$data['ext']             = 'svg';
		$data['type']            = 'image/svg+xml';
		$data['proper_filename'] = false;
		return $data;
	}

	/**
	 * Sanitizes SVG files before they are stored.
	 *
	 * @param array<string, mixed> $file Uploaded file entry.
	 * @return array<string, mixed>
	 */
	public static function sanitize_upload( array $file ): array {
		if ( ! isset( $file['tmp_name'], $file['name'] ) || ! is_file( $file['tmp_name'] ) ) {
			return $file;
		}
		if ( 'svg' !== strtolower( pathinfo( (string) $file['name'], PATHINFO_EXTENSION ) ) ) {
			return $file;
		}

		$contents = (string) file_get_contents( $file['tmp_name'] ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- Local file read.
		$clean    = SVG_Sanitizer::sanitize( $contents );
		if ( is_wp_error( $clean ) ) {
			$file['error'] = $clean->get_error_message();
			return $file;
		}

		file_put_contents( $file['tmp_name'], $clean ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_file_put_contents -- Local temp file write.
		$file['size'] = filesize( $file['tmp_name'] );
		return $file;
	}

	/**
	 * Stores the SVG dimensions so image functions can size it.
	 *
	 * @param array<string, mixed> $metadata      Attachment metadata.
	 * @param int                  $attachment_id Attachment ID.
	 * @return array<string, mixed>
	 */
	public static function add_dimensions( array $metadata, int $attachment_id ): array {
		if ( 'image/svg+xml' !== get_post_mime_type( $attachment_id ) ) {
			return $metadata;
		}

		$file = get_attached_file( $attachment_id );
		if ( ! $file || ! is_readable( $file ) ) {
			return $metadata;
		}

		$dimensions = self::read_dimensions( (string) file_get_contents( $file ) ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- Local file read.
		if ( null === $dimensions ) {
			return $metadata;
		}

		$metadata['width']  = $dimensions[0];
		$metadata['height'] = $dimensions[1];
		if ( empty( $metadata['file'] ) ) {
			$metadata['file'] = _wp_relative_upload_path( $file );
		}
		return $metadata;
	}

	/**
	 * Gives the media library a preview for SVG attachments.
	 *
	 * SVG files have no generated sizes, so the grid falls back to the
	 * file itself.
	 *
	 * @param array<string, mixed> $response   Attachment data for the JS layer.
	 * @param \WP_Post             $attachment Attachment post.
	 * @param mixed                $meta       Attachment metadata.
	 * @return array<string, mixed>
	 */
	public static function prepare_attachment( array $response, \WP_Post $attachment, $meta ): array { // phpcs:ignore Generic.CodeAnalysis.UnusedFunctionParameter.FoundAfterLastUsed -- Signature required by the filter.
		if ( 'image/svg+xml' !== $attachment->post_mime_type ) {
			return $response;
		}

		$url = wp_get_attachment_url( $attachment->ID );
		if ( ! $url ) {
			return $response;
		}

		$width  = isset( $response['width'] ) ? (int) $response['width'] : 0;
		$height = isset( $response['height'] ) ? (int) $response['height'] : 0;
		$size   = array(
			'url'         => $url,
			'width'       => $width,
			'height'      => $height,
			'orientation' => $height > $width ? 'portrait' : 'landscape',
		);

		$response['thumb'] = $url;
		foreach ( array( 'thumbnail', 'medium', 'full' ) as $name ) {
			$response['sizes'][ $name ] = $size;
		}

		return $response;
	}

	/**
	 * Whether the current context may upload SVG files.
	 *
	 * Users need the upload capability (authors, editors, administrators).
	 * CLI imports are trusted admin operations and run without a user.
	 */
	private static function can_upload_svg(): bool {
		if ( defined( 'WP_CLI' ) && WP_CLI ) {
			return true;
		}
		return current_user_can( 'upload_files' );
	}

	/**
	 * Whether the contents look like an SVG document.
	 *
	 * @param string $contents Raw file contents.
	 */
	private static function looks_like_svg( string $contents ): bool {
		return (bool) preg_match( '/<svg[:\s>\/]/i', $contents )
			&& ! preg_match( '/<!\s*(DOCTYPE|ENTITY)/i', $contents );
	}

	/**
	 * Reads width/height from the SVG root, falling back to viewBox.
	 *
	 * @param string $contents SVG file contents.
	 * @return array{0: int, 1: int}|null
	 */
	private static function read_dimensions( string $contents ): ?array {
		if (
			preg_match( '/<svg[^>]*\swidth\s*=\s*["\']\s*([0-9.]+)(?:px)?\s*["\']/i', $contents, $w ) &&
			preg_match( '/<svg[^>]*\sheight\s*=\s*["\']\s*([0-9.]+)(?:px)?\s*["\']/i', $contents, $h )
		) {
			return array(
				max( 1, (int) round( (float) $w[1] ) ),
				max( 1, (int) round( (float) $h[1] ) ),
			);
		}

		if ( preg_match( '/<svg[^>]*\sviewBox\s*=\s*["\']\s*[-\d.]+\s+[-\d.]+\s+([\d.]+)\s+([\d.]+)\s*["\']/i', $contents, $m ) ) {
			return array(
				max( 1, (int) round( (float) $m[1] ) ),
				max( 1, (int) round( (float) $m[2] ) ),
			);
		}

		return null;
	}
}
