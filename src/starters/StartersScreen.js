import apiFetch from '@wordpress/api-fetch';
import { useEffect, useState } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import StateMessage from '../components/StateMessage';

export default function StartersScreen() {
	const [ patterns, setPatterns ] = useState( [] );
	const [ starters, setStarters ] = useState( [] );
	const [ maxStarters, setMaxStarters ] = useState( 8 );
	const [ status, setStatus ] = useState( 'loading' );
	const [ saving, setSaving ] = useState( false );
	const [ message, setMessage ] = useState( '' );

	useEffect( () => {
		apiFetch( { path: '/q2/v1/knowledge/patterns' } )
			.then( ( result ) => {
				setPatterns( result.patterns );
				setStarters( result.starters );
				setMaxStarters( result.maxStarters );
				setStatus( 'ready' );
			} )
			.catch( () => setStatus( 'error' ) );
	}, [] );

	const toggle = ( name ) => {
		setStarters( ( prev ) => {
			if ( prev.includes( name ) ) {
				return prev.filter( ( item ) => item !== name );
			}
			if ( prev.length >= maxStarters ) {
				return prev;
			}
			return [ ...prev, name ];
		} );
	};

	const move = ( index, delta ) => {
		setStarters( ( prev ) => {
			const next = [ ...prev ];
			const target = index + delta;
			if ( target < 0 || target >= next.length ) {
				return prev;
			}
			[ next[ index ], next[ target ] ] = [
				next[ target ],
				next[ index ],
			];
			return next;
		} );
	};

	const save = async () => {
		setSaving( true );
		setMessage( '' );
		try {
			const result = await apiFetch( {
				path: '/q2/v1/knowledge/starters',
				method: 'POST',
				data: { names: starters },
			} );
			setStarters( result.names );
			setMessage( __( 'Starter patterns saved.', 'q2' ) );
		} catch ( error ) {
			setMessage(
				error.message || __( 'The starters could not be saved.', 'q2' )
			);
		} finally {
			setSaving( false );
		}
	};

	const grouped = patterns.reduce( ( acc, pattern ) => {
		const category =
			pattern.categories.length > 0 ? pattern.categories[ 0 ] : 'general';
		if ( ! acc[ category ] ) {
			acc[ category ] = [];
		}
		acc[ category ].push( pattern );
		return acc;
	}, {} );

	if ( status === 'loading' ) {
		return (
			<div className="q2-column q2-starters-screen">
				<p>{ __( 'Loading patterns…', 'q2' ) }</p>
			</div>
		);
	}

	if ( status === 'error' ) {
		return (
			<div className="q2-column q2-starters-screen">
				<StateMessage>
					<strong>
						{ __( 'Patterns could not be loaded.', 'q2' ) }
					</strong>
				</StateMessage>
			</div>
		);
	}

	return (
		<div className="q2-column q2-starters-screen">
			<header className="q2-page-header">
				<div>
					<span className="q2-eyebrow">
						{ __( 'Workspace', 'q2' ) }
					</span>
					<h1>{ __( 'Starter Buttons', 'q2' ) }</h1>
				</div>
				<button
					type="button"
					className="q2-starters-save"
					onClick={ save }
					disabled={ saving }
				>
					{ saving
						? __( 'Saving…', 'q2' )
						: __( 'Save starters', 'q2' ) }
				</button>
			</header>
			<p className="q2-starters-help">
				{ sprintf(
					/* translators: %d: maximum number of starters. */
					__(
						'Choose up to %d Starter Buttons that appear when members create a new post or page. Order the buttons to control the priority of each pattern.',
						'q2'
					),
					maxStarters
				) }
			</p>
			{ starters.length > 0 && (
				<ol className="q2-starters-current">
					{ starters.map( ( name, index ) => {
						const pattern = patterns.find(
							( item ) => item.name === name
						);
						return (
							<li key={ name }>
								<button
									type="button"
									className="q2-starter-up"
									onClick={ () => move( index, -1 ) }
									disabled={ index === 0 }
									aria-label={ __( 'Move up', 'q2' ) }
								>
									▴
								</button>
								<button
									type="button"
									className="q2-starter-down"
									onClick={ () => move( index, 1 ) }
									disabled={ index === starters.length - 1 }
									aria-label={ __( 'Move down', 'q2' ) }
								>
									▾
								</button>
								<strong>{ pattern?.title || name }</strong>
								<button
									type="button"
									className="q2-starter-remove"
									onClick={ () => toggle( name ) }
								>
									{ __( 'Remove', 'q2' ) }
								</button>
							</li>
						);
					} ) }
				</ol>
			) }
			<div className="q2-starters-grouped">
				{ Object.entries( grouped ).map( ( [ category, items ] ) => (
					<section key={ category }>
						<h2>{ category }</h2>
						<ul className="q2-pattern-list">
							{ items.map( ( pattern ) => {
								const selected = starters.includes(
									pattern.name
								);
								return (
									<li
										key={ pattern.name }
										className={
											selected ? 'is-selected' : ''
										}
									>
										<button
											type="button"
											onClick={ () =>
												toggle( pattern.name )
											}
											disabled={
												! selected &&
												starters.length >= maxStarters
											}
										>
											<strong>{ pattern.title }</strong>
											{ pattern.description && (
												<p>{ pattern.description }</p>
											) }
											<small>
												{ selected
													? __( 'Starter', 'q2' )
													: __(
															'Add to starters',
															'q2'
													  ) }
											</small>
										</button>
									</li>
								);
							} ) }
						</ul>
					</section>
				) ) }
			</div>
			<p aria-live="polite">{ message }</p>
		</div>
	);
}
