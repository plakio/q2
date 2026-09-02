import apiFetch from '@wordpress/api-fetch';
import { useEffect, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

export default function ProjectsScreen() {
	const [ workspaces, setWorkspaces ] = useState( [] );
	const [ status, setStatus ] = useState( 'loading' );
	const [ error, setError ] = useState( '' );
	const [ request, setRequest ] = useState( 0 );

	useEffect( () => {
		let active = true;
		setStatus( 'loading' );
		setError( '' );

		apiFetch( { path: '/q2/v1/workspaces' } )
			.then( ( result ) => {
				if ( active ) {
					setWorkspaces( Array.isArray( result ) ? result : [] );
					setStatus( 'ready' );
				}
			} )
			.catch( ( reason ) => {
				if ( active ) {
					setError(
						reason.message ||
							__( 'Projects could not be loaded.', 'q2' )
					);
					setStatus( 'error' );
				}
			} );

		return () => {
			active = false;
		};
	}, [ request ] );

	return (
		<div className="q2-column q2-projects-screen">
			<header className="q2-page-header">
				<div>
					<span className="q2-eyebrow">
						{ __( 'Workspaces', 'q2' ) }
					</span>
					<h1>{ __( 'Projects', 'q2' ) }</h1>
				</div>
			</header>
			{ status === 'loading' && (
				<p className="q2-projects-status">
					{ __( 'Loading projects…', 'q2' ) }
				</p>
			) }
			{ status === 'error' && (
				<div className="q2-projects-status" role="alert">
					<strong>{ error }</strong>
					<button
						type="button"
						onClick={ () => setRequest( ( value ) => value + 1 ) }
					>
						{ __( 'Try again', 'q2' ) }
					</button>
				</div>
			) }
			{ status === 'ready' && workspaces.length === 0 && (
				<div className="q2-projects-status">
					<strong>{ __( 'No projects available.', 'q2' ) }</strong>
					<span>
						{ __(
							'You do not currently have access to any projects.',
							'q2'
						) }
					</span>
				</div>
			) }
			{ status === 'ready' && workspaces.length > 0 && (
				<ul className="q2-projects-grid">
					{ workspaces.map( ( workspace ) => (
						<li key={ workspace.id }>
							<a
								href={ workspace.homeUrl }
								aria-current={
									workspace.isCurrent ? 'page' : undefined
								}
							>
								<span
									className="q2-project-icon"
									aria-hidden="true"
								>
									{ workspace.iconUrl ? (
										<img src={ workspace.iconUrl } alt="" />
									) : (
										workspace.name
											.slice( 0, 1 )
											.toUpperCase()
									) }
								</span>
								<span className="q2-project-name">
									{ workspace.name }
								</span>
								{ workspace.isCurrent && (
									<span className="q2-project-current">
										{ __( 'Current workspace', 'q2' ) }
									</span>
								) }
							</a>
						</li>
					) ) }
				</ul>
			) }
		</div>
	);
}
