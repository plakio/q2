/**
 * Link suggestions for the block editor's link UI.
 *
 * Powers the autocomplete shown by the LinkControl/URLInput when the user
 * inserts an internal link, matching readable posts and pages in the
 * workspace via the core search endpoint.
 */
import apiFetch from '@wordpress/api-fetch';
import { __ } from '@wordpress/i18n';

/**
 * Decodes HTML entities that may be present in REST titles.
 *
 * @param {string} text Raw title.
 * @return {string} Decoded title.
 */
function decodeEntities( text ) {
	if ( ! text ) {
		return '';
	}
	const element = document.createElement( 'textarea' );
	element.innerHTML = text;
	return element.value;
}

/**
 * Rewrites a native WordPress permalink into the equivalent Q2 deep link.
 *
 * Pages keep their full hierarchical path; posts use their slug.
 *
 * @param {string} nativeUrl Native permalink returned by the REST API.
 * @param {string} type      Object subtype (`post` or `page`).
 * @return {string} Q2 deep link, or the native URL when it cannot be derived.
 */
export function toQ2Url( nativeUrl, type ) {
	const appUrl = window.q2Settings?.appUrl;
	const homeUrl = window.q2Settings?.homeUrl;
	if ( ! appUrl || ! homeUrl ) {
		return nativeUrl;
	}

	let pathname;
	try {
		pathname = new URL( nativeUrl ).pathname;
	} catch {
		return nativeUrl;
	}

	const homePath = new URL( homeUrl ).pathname.replace( /\/$/, '' );
	const relative = pathname
		.slice( homePath.length )
		.replace( /^\/+|\/+$/g, '' );
	if ( ! relative ) {
		return nativeUrl;
	}

	if ( type === 'page' ) {
		return `${ appUrl }pages/${ relative }/`;
	}

	return `${ appUrl }feed/${ relative.split( '/' ).pop() }/`;
}

/**
 * Fetches link suggestions for a search term.
 *
 * @param {string}  search                       Search term.
 * @param {Object}  options                      Search options.
 * @param {boolean} options.isInitialSuggestions Whether this is the initial query.
 * @return {Promise<Array>} Suggestion objects understood by URLInput.
 */
export async function fetchLinkSuggestions(
	search,
	{ isInitialSuggestions = false } = {}
) {
	const params = new URLSearchParams( {
		search,
		per_page: String( isInitialSuggestions ? 5 : 10 ),
		type: 'post',
		subtype: 'post,page',
	} );

	const results = await apiFetch( {
		path: `/wp/v2/search?${ params.toString() }`,
	} ).catch( () => [] );

	return results
		.filter( ( result ) => result.id && result.url )
		.map( ( result ) => {
			const type = result.subtype || result.type;
			return {
				id: result.id,
				url: toQ2Url( result.url, type ),
				title:
					decodeEntities( result.title ) || __( '(no title)', 'q2' ),
				type,
				kind: 'post-type',
			};
		} );
}
