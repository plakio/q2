import apiFetch from '@wordpress/api-fetch';
import { useEffect, useState } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';

export default function PeopleScreen() {
	const [ query, setQuery ] = useState( '' );
	const [ people, setPeople ] = useState( [] );
	const [ status, setStatus ] = useState( 'loading' );
	const [ error, setError ] = useState( '' );

	useEffect( () => {
		let active = true;
		const timer = window.setTimeout( () => {
			setStatus( 'loading' );
			apiFetch( {
				path: `/q2/v1/people?search=${ encodeURIComponent( query ) }`,
			} )
				.then( ( result ) => {
					if ( active ) {
						setPeople( result );
						setStatus( 'ready' );
					}
				} )
				.catch( ( reason ) => {
					if ( active ) {
						setError(
							reason.message ||
								__( 'People could not be loaded.', 'q2' )
						);
						setStatus( 'error' );
					}
				} );
		}, 200 );

		return () => {
			active = false;
			window.clearTimeout( timer );
		};
	}, [ query ] );

	return (
		<div className="q2-column q2-people-screen">
			<header className="q2-page-header">
				<div>
					<span className="q2-eyebrow">
						{ __( 'Workspace', 'q2' ) }
					</span>
					<h1>{ __( 'People', 'q2' ) }</h1>
				</div>
				<label htmlFor="q2-people-search">
					<span className="screen-reader-text">
						{ __( 'Search people', 'q2' ) }
					</span>
					<input
						id="q2-people-search"
						type="search"
						value={ query }
						onChange={ ( event ) => setQuery( event.target.value ) }
						placeholder={ __( 'Search people', 'q2' ) }
					/>
				</label>
			</header>
			{ status === 'loading' && <p>{ __( 'Loading people…', 'q2' ) }</p> }
			{ status === 'error' && <p role="alert">{ error }</p> }
			{ status === 'ready' && (
				<div className="q2-people-grid">
					{ people.map( ( person ) => (
						<article key={ person.id }>
							<img src={ person.avatarUrl } alt="" />
							<div>
								<h2>{ person.name }</h2>
								<span className="q2-person-mention">
									@{ person.slug }
								</span>
								<p>
									{ person.roles.length
										? person.roles.join( ' · ' )
										: __( 'Member', 'q2' ) }
								</p>
							</div>
						</article>
					) ) }
					{ people.length === 0 && (
						<p>
							{ sprintf(
								/* translators: %s: search query. */
								__( 'No people found for “%s”.', 'q2' ),
								query
							) }
						</p>
					) }
				</div>
			) }
		</div>
	);
}
