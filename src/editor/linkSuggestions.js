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
		.map( ( result ) => ( {
			id: result.id,
			url: result.url,
			title: decodeEntities( result.title ) || __( '(no title)', 'q2' ),
			type: result.subtype || result.type,
			kind: 'post-type',
		} ) );
}
