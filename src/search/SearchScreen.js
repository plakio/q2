import apiFetch from '@wordpress/api-fetch';
import { useEffect, useState } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import StateMessage from '../components/StateMessage';

const ALL_TYPES = [
	{ key: '', label: __( 'All', 'q2' ) },
	{ key: 'post', label: __( 'Posts', 'q2' ) },
	{ key: 'page', label: __( 'Pages', 'q2' ) },
	{ key: 'comment', label: __( 'Comments', 'q2' ) },
	{ key: 'person', label: __( 'People', 'q2' ) },
	{ key: 'tag', label: __( 'Tags', 'q2' ) },
];

export default function SearchScreen() {
	const [ query, setQuery ] = useState( '' );
	const [ results, setResults ] = useState( [] );
	const [ counts, setCounts ] = useState( {
		post: 0,
		page: 0,
		comment: 0,
		person: 0,
		tag: 0,
	} );
	const [ status, setStatus ] = useState( 'idle' );
	const [ errorMessage, setErrorMessage ] = useState( '' );
	const [ type, setType ] = useState( '' );

	useEffect( () => {
		if ( ! query.trim() ) {
			setResults( [] );
			setStatus( 'idle' );
			return undefined;
		}
		let active = true;
		const timer = window.setTimeout( () => {
			setStatus( 'loading' );
			setErrorMessage( '' );
			const params = new URLSearchParams( { search: query } );
			if ( type ) {
				params.set( 'type', type );
			}
			apiFetch( { path: `/q2/v1/search?${ params.toString() }` } )
				.then( ( result ) => {
					if ( active ) {
						setResults( result.results );
						setCounts( result.counts );
						setStatus( 'ready' );
					}
				} )
				.catch( ( reason ) => {
					if ( active ) {
						setStatus( 'error' );
						setErrorMessage(
							reason.message || __( 'Search failed.', 'q2' )
						);
					}
				} );
		}, 250 );
		return () => {
			active = false;
			window.clearTimeout( timer );
		};
	}, [ query, type ] );

	return (
		<div className="q2-column q2-search-screen">
			<header className="q2-page-header">
				<div>
					<span className="q2-eyebrow">
						{ __( 'Workspace', 'q2' ) }
					</span>
					<h1>{ __( 'Search', 'q2' ) }</h1>
				</div>
				<label htmlFor="q2-search-input">
					<span className="screen-reader-text">
						{ __( 'Search workspace', 'q2' ) }
					</span>
					<input
						id="q2-search-input"
						type="search"
						value={ query }
						onChange={ ( event ) => setQuery( event.target.value ) }
						placeholder={ __(
							'Search posts, pages, comments, people, tags…',
							'q2'
						) }
					/>
				</label>
			</header>
			<div className="q2-search-filters">
				{ ALL_TYPES.map( ( option ) => (
					<button
						key={ option.key }
						type="button"
						className={ type === option.key ? 'is-active' : '' }
						onClick={ () => setType( option.key ) }
					>
						{ option.label }
						{ option.key && counts[ option.key ] > 0 && (
							<span className="q2-search-count">
								{ counts[ option.key ] }
							</span>
						) }
					</button>
				) ) }
			</div>
			{ status === 'idle' && (
				<StateMessage>
					<strong>
						{ __( 'Find anything in this workspace', 'q2' ) }
					</strong>
					<span>
						{ __(
							'Type to search posts, pages, comments, people, and tags.',
							'q2'
						) }
					</span>
				</StateMessage>
			) }
			{ status === 'loading' && <p>{ __( 'Searching…', 'q2' ) }</p> }
			{ status === 'error' && <p role="alert">{ errorMessage }</p> }
			{ status === 'ready' && results.length === 0 && (
				<StateMessage>
					<strong>
						{ sprintf(
							/* translators: %s: search query. */
							__( 'No results for “%s”', 'q2' ),
							query
						) }
					</strong>
				</StateMessage>
			) }
			{ status === 'ready' && results.length > 0 && (
				<ul className="q2-search-results">
					{ results.map( ( item ) => (
						<li
							key={ `${ item.type }-${ item.id }` }
							className={ `q2-search-result is-${ item.type }` }
						>
							<a
								href={
									item.url ||
									window.q2Settings?.homeUrl ||
									'/'
								}
								className="q2-search-link"
							>
								<span className="q2-search-type">
									{ item.type }
								</span>
								<strong>{ item.title }</strong>
								{ item.excerpt && <p>{ item.excerpt }</p> }
							</a>
						</li>
					) ) }
				</ul>
			) }
		</div>
	);
}
