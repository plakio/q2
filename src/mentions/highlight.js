/**
 * Paints @-mentions inside rendered content.
 *
 * Mentions are stored as plain text (`@slug`), so nothing distinguishes
 * them when a post or comment is displayed. This helper wraps the ones
 * that resolve to workspace members (plus `@all`) in a styled span
 * right before rendering, without touching the stored content.
 */
import apiFetch from '@wordpress/api-fetch';
import { useEffect, useMemo, useState } from '@wordpress/element';

// Mirrors the server-side mention matcher, minus the capture.
const MENTION_PATTERN = /(?<![\p{L}\p{N}_.-])@([\p{L}\p{N}_.-]+)/gu;

// Elements whose text must never be rewritten (links stay links, code
// stays literal).
const SKIP_ANCESTORS = new Set( [
	'A',
	'CODE',
	'PRE',
	'SCRIPT',
	'STYLE',
	'TEXTAREA',
] );

let cachedSlugs = null;

/**
 * Fetches the workspace member slugs once per page load.
 *
 * @return {Promise<Set<string>>} Lowercase member slugs.
 */
export function fetchMentionSlugs() {
	if ( ! cachedSlugs ) {
		cachedSlugs = apiFetch( { path: '/q2/v1/people' } )
			.then(
				( result ) =>
					new Set(
						( Array.isArray( result ) ? result : [] ).map(
							( member ) =>
								String( member?.slug || '' ).toLowerCase()
						)
					)
			)
			.catch( () => new Set() );
	}
	return cachedSlugs;
}

/**
 * Whether a mention token resolves to a member or to everyone.
 *
 * @param {string}      token Raw token without the `@`.
 * @param {Set<string>} slugs Lowercase member slugs.
 * @return {string|null} Clean token, or null when it is not a mention.
 */
function resolveMention( token, slugs ) {
	const clean = token.replace( /[.-]+$/, '' ).toLowerCase();
	if ( '' === clean ) {
		return null;
	}
	if ( 'all' === clean ) {
		return clean;
	}
	return slugs.has( clean ) ? clean : null;
}

/**
 * Rewrites a single text node, wrapping resolvable mentions.
 *
 * @param {Text}        node  Text node to rewrite.
 * @param {Set<string>} slugs Lowercase member slugs.
 */
function paintTextNode( node, slugs ) {
	const text = node.nodeValue;
	MENTION_PATTERN.lastIndex = 0;
	if ( ! MENTION_PATTERN.test( text ) ) {
		return;
	}
	MENTION_PATTERN.lastIndex = 0;
	const fragment = document.createDocumentFragment();
	let lastIndex = 0;
	let painted = false;
	let match;
	while ( ( match = MENTION_PATTERN.exec( text ) ) !== null ) {
		const clean = resolveMention( match[ 1 ], slugs );
		if ( null === clean ) {
			continue;
		}
		// match[0] starts with `@`; match[1] is the raw token which may
		// carry trailing punctuation that stays outside the pill.
		const head = match[ 0 ].length - match[ 1 ].length;
		fragment.appendChild(
			document.createTextNode( text.slice( lastIndex, match.index ) )
		);
		const span = document.createElement( 'span' );
		span.className = 'q2-mention';
		span.textContent = '@' + clean;
		fragment.appendChild( span );
		lastIndex = match.index + head + clean.length;
		painted = true;
	}
	if ( ! painted ) {
		return;
	}
	fragment.appendChild( document.createTextNode( text.slice( lastIndex ) ) );
	node.parentNode.replaceChild( fragment, node );
}

/**
 * Wraps resolvable @-mentions in text nodes with a styled span.
 *
 * @param {string}      html  Rendered content HTML.
 * @param {Set<string>} slugs Lowercase member slugs.
 * @return {string} HTML with mentions wrapped.
 */
export function highlightMentions( html, slugs ) {
	if ( ! html || ! slugs || 0 === slugs.size ) {
		return html;
	}
	const template = document.createElement( 'template' );
	template.innerHTML = html;
	const walker = document.createTreeWalker(
		template.content,
		window.NodeFilter.SHOW_TEXT
	);
	const nodes = [];
	let current = walker.nextNode();
	while ( current ) {
		nodes.push( current );
		current = walker.nextNode();
	}
	nodes.forEach( ( node ) => {
		let ancestor = node.parentElement;
		while ( ancestor ) {
			if (
				SKIP_ANCESTORS.has( ancestor.tagName ) ||
				ancestor.classList?.contains( 'q2-mention' )
			) {
				return;
			}
			ancestor = ancestor.parentElement;
		}
		paintTextNode( node, slugs );
	} );
	const wrapper = document.createElement( 'div' );
	wrapper.appendChild( template.content );
	return wrapper.innerHTML;
}

/**
 * Returns rendered HTML with @-mentions painted.
 *
 * Falls back to the raw HTML until the member list arrives.
 *
 * @param {string} html Rendered content HTML.
 * @return {string} HTML with mentions wrapped.
 */
export function useHighlightedMentions( html ) {
	const [ slugs, setSlugs ] = useState( null );
	useEffect( () => {
		let active = true;
		fetchMentionSlugs().then( ( result ) => {
			if ( active ) {
				setSlugs( result );
			}
		} );
		return () => {
			active = false;
		};
	}, [] );
	return useMemo( () => highlightMentions( html, slugs ), [ html, slugs ] );
}

/**
 * Renders HTML content with @-mentions painted.
 *
 * @param {Object} props           Component props.
 * @param {string} props.html      Rendered content HTML.
 * @param {string} props.className CSS class for the wrapper.
 * @param {Object} props.divRef    Ref forwarded to the wrapper.
 * @return {Element} Content wrapper.
 */
export function HighlightedContent( { html, className, divRef } ) {
	const highlighted = useHighlightedMentions( html );
	return (
		<div
			ref={ divRef }
			className={ className }
			dangerouslySetInnerHTML={ { __html: highlighted } }
		/>
	);
}
