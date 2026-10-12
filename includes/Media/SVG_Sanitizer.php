<?php
/**
 * SVG sanitization with a strict allowlist.
 *
 * @package Q2
 */

declare( strict_types=1 );

namespace Q2\Media;

defined( 'ABSPATH' ) || exit;

// The PHP DOM extension fixes these property names ($documentElement,
// $nodeName, $childNodes, ...); they cannot follow WordPress naming rules.
// phpcs:disable WordPress.NamingConventions.ValidVariableName

/**
 * Cleans uploaded SVG files so they can be served from the media library.
 *
 * SVGs are XML documents that can carry scripts, event handlers, and
 * external references. This sanitizer keeps the drawing primitives and
 * drops everything executable: no scripts, no event attributes, no
 * external or data URLs, and no DOCTYPE/entity declarations.
 */
final class SVG_Sanitizer {
	/**
	 * Largest SVG that will be parsed, in bytes.
	 */
	private const MAX_BYTES = 5 * 1024 * 1024;

	/**
	 * Elements kept in the output (lowercase).
	 *
	 * @var string[]
	 */
	private const ALLOWED_ELEMENTS = array(
		'svg',
		'g',
		'defs',
		'symbol',
		'use',
		'switch',
		'path',
		'rect',
		'circle',
		'ellipse',
		'line',
		'polyline',
		'polygon',
		'text',
		'tspan',
		'textpath',
		'title',
		'desc',
		'clippath',
		'mask',
		'pattern',
		'marker',
		'lineargradient',
		'radialgradient',
		'stop',
		'filter',
		'fegaussianblur',
		'feoffset',
		'feblend',
		'fecolormatrix',
		'fecomponenttransfer',
		'fefunca',
		'fefuncr',
		'fefuncg',
		'fefuncb',
		'fecomposite',
		'feflood',
		'femerge',
		'femergenode',
		'femorphology',
		'fedropshadow',
		'feturbulence',
		'fedisplacementmap',
	);

	/**
	 * Attributes kept, lowercased.
	 *
	 * @var string[]
	 */
	private const ALLOWED_ATTRIBUTES = array(
		// Core.
		'id',
		'class',
		'style',
		'role',
		'tabindex',
		'lang',
		'xmlns',
		'xmlns:xlink',
		'version',
		'baseprofile',
		'viewbox',
		'preserveaspectratio',
		'width',
		'height',
		'x',
		'y',
		'overflow',
		'display',
		'visibility',
		'opacity',
		'color',
		// Shapes.
		'd',
		'points',
		'x1',
		'y1',
		'x2',
		'y2',
		'cx',
		'cy',
		'r',
		'rx',
		'ry',
		'pathlength',
		// Paint.
		'fill',
		'fill-opacity',
		'fill-rule',
		'stroke',
		'stroke-width',
		'stroke-linecap',
		'stroke-linejoin',
		'stroke-dasharray',
		'stroke-dashoffset',
		'stroke-miterlimit',
		'stroke-opacity',
		'color-interpolation',
		'color-interpolation-filters',
		'paint-order',
		'shape-rendering',
		'vector-effect',
		// Transforms.
		'transform',
		'transform-origin',
		// Text.
		'text-anchor',
		'dominant-baseline',
		'alignment-baseline',
		'font-family',
		'font-size',
		'font-size-adjust',
		'font-weight',
		'font-style',
		'font-stretch',
		'font-variant',
		'letter-spacing',
		'word-spacing',
		'kerning',
		'text-decoration',
		'writing-mode',
		'dx',
		'dy',
		'rotate',
		'textlength',
		'lengthadjust',
		'direction',
		// References, gradients, and patterns.
		'href',
		'xlink:href',
		'offset',
		'stop-color',
		'stop-opacity',
		'gradientunits',
		'gradienttransform',
		'spreadmethod',
		'patternunits',
		'patterncontentunits',
		'patterntransform',
		'clippathunits',
		'maskunits',
		'maskcontentunits',
		'mask-type',
		'markerwidth',
		'markerheight',
		'markerunits',
		'refx',
		'refy',
		'orient',
		'startoffset',
		'method',
		'spacing',
		// Filters.
		'filterunits',
		'primitiveunits',
		'in',
		'in2',
		'result',
		'mode',
		'type',
		'values',
		'operator',
		'k1',
		'k2',
		'k3',
		'k4',
		'stddeviation',
		'radius',
		'scale',
		'xchannelselector',
		'ychannelselector',
		'seed',
		'numoctaves',
		'stitchtiles',
		'flood-color',
		'flood-opacity',
		'slope',
		'intercept',
		'amplitude',
		'exponent',
		'tablevalues',
	);

	/**
	 * Sanitizes an SVG document.
	 *
	 * @param string $contents Raw file contents.
	 * @return string|\WP_Error Clean SVG markup or a user-facing error.
	 */
	public static function sanitize( string $contents ): string|\WP_Error {
		$contents = (string) preg_replace( '/^\xEF\xBB\xBF/', '', $contents );

		if ( strlen( $contents ) > self::MAX_BYTES ) {
			return new \WP_Error(
				'q2_svg_too_large',
				__( 'The SVG file is too large to sanitize.', 'q2' )
			);
		}

		if ( ! preg_match( '/<svg[:\s>\/]/i', $contents ) ) {
			return new \WP_Error(
				'q2_svg_invalid',
				__( 'The file does not look like an SVG image.', 'q2' )
			);
		}

		if ( preg_match( '/<!\s*(DOCTYPE|ENTITY)/i', $contents ) ) {
			return new \WP_Error(
				'q2_svg_unsafe',
				__( 'The SVG contains a DOCTYPE or entity declaration and was rejected.', 'q2' )
			);
		}

		$previous                     = libxml_use_internal_errors( true );
		$document                     = new \DOMDocument();
		$document->preserveWhiteSpace = true;
		$loaded                       = $document->loadXML( $contents, LIBXML_NONET );
		libxml_clear_errors();
		libxml_use_internal_errors( $previous );

		if ( ! $loaded || ! $document->documentElement ) {
			return new \WP_Error(
				'q2_svg_invalid',
				__( 'The SVG could not be parsed as XML.', 'q2' )
			);
		}

		$root = $document->documentElement;
		if ( 'svg' !== strtolower( (string) $root->localName ) ) {
			return new \WP_Error(
				'q2_svg_invalid',
				__( 'The SVG root element is missing.', 'q2' )
			);
		}

		self::clean_element( $root );

		if ( ! $root->hasAttribute( 'xmlns' ) ) {
			$root->setAttribute( 'xmlns', 'http://www.w3.org/2000/svg' );
		}

		return (string) $document->saveXML( $root );
	}

	/**
	 * Recursively drops disallowed elements and attributes.
	 *
	 * @param \DOMElement $element Element to clean.
	 */
	private static function clean_element( \DOMElement $element ): void {
		foreach ( iterator_to_array( $element->attributes ) as $attribute ) {
			$name  = strtolower( $attribute->nodeName );
			$value = (string) $attribute->nodeValue;

			if ( ! self::is_allowed_attribute( $name, $value ) ) {
				$element->removeAttributeNode( $attribute );
				continue;
			}

			if ( 'style' === $name ) {
				$style = self::sanitize_style( $value );
				if ( '' === $style ) {
					$element->removeAttributeNode( $attribute );
				} else {
					$attribute->value = $style;
				}
			}
		}

		foreach ( iterator_to_array( $element->childNodes ) as $child ) {
			if ( XML_ELEMENT_NODE === $child->nodeType ) {
				if ( ! self::is_allowed_element( (string) $child->localName ) ) {
					$element->removeChild( $child );
					continue;
				}
				self::clean_element( $child );
				continue;
			}

			if ( XML_TEXT_NODE !== $child->nodeType && XML_CDATA_SECTION_NODE !== $child->nodeType ) {
				// Comments, processing instructions, doctype leftovers.
				$element->removeChild( $child );
			}
		}
	}

	/**
	 * Whether an element is part of the allowlist.
	 *
	 * @param string $name Element local name.
	 */
	private static function is_allowed_element( string $name ): bool {
		return in_array( strtolower( $name ), self::ALLOWED_ELEMENTS, true );
	}

	/**
	 * Whether an attribute is safe to keep.
	 *
	 * @param string $name  Attribute name, lowercased.
	 * @param string $value Attribute value.
	 */
	private static function is_allowed_attribute( string $name, string $value ): bool {
		if ( str_starts_with( $name, 'on' ) ) {
			return false;
		}

		if ( str_starts_with( $name, 'data-' ) || str_starts_with( $name, 'aria-' ) ) {
			return true;
		}

		if ( 'href' === $name || 'xlink:href' === $name ) {
			// Internal references only: external and data URLs are dropped.
			return (bool) preg_match( '/^\s*#[A-Za-z0-9_.:-]+$/', $value );
		}

		if ( preg_match( '/url\s*\(/i', $value ) ) {
			// Paint references must be internal fragments too, so a
			// fill="url(https://…)" cannot fetch a remote resource.
			return (bool) preg_match( '/^url\s*\(\s*[\'"]?#[A-Za-z0-9_.:-]+[\'"]?\s*\)$/i', trim( $value ) );
		}

		return in_array( $name, self::ALLOWED_ATTRIBUTES, true );
	}

	/**
	 * Drops style declarations that can fetch or execute anything.
	 *
	 * @param string $value Raw style attribute.
	 * @return string Sanitized style, or an empty string when unsafe.
	 */
	private static function sanitize_style( string $value ): string {
		if ( preg_match( '/@import|expression\s*\(|javascript\s*:|vbscript\s*:|behavior\s*:|moz-binding|url\s*\(|\\\\/i', $value ) ) {
			return '';
		}
		return $value;
	}
}
