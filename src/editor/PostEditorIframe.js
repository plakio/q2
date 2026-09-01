import apiFetch from '@wordpress/api-fetch';
import { useEffect, useRef, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { Spinner } from '@wordpress/components';

async function fetchEditorUrl( { postId, postType } ) {
	const path =
		postId > 0
			? `/q2/v1/editor-url?post_id=${ postId }`
			: `/q2/v1/editor-url?post_type=${ postType || 'post' }`;
	const response = await apiFetch( { path } );
	return response?.url || '';
}

export default function PostEditorIframe( {
	postId = 0,
	postType = 'post',
	isNew = false,
	onClose,
	onSaved,
	title,
} ) {
	const [ ready, setReady ] = useState( false );
	const [ url, setUrl ] = useState( '' );
	const [ error, setError ] = useState( '' );
	const wrapperRef = useRef( null );

	useEffect( () => {
		let cancelled = false;
		setReady( false );
		setError( '' );
		setUrl( '' );
		fetchEditorUrl( { postId, postType } )
			.then( ( resolved ) => {
				if ( ! cancelled ) {
					setUrl( resolved );
				}
			} )
			.catch( ( reason ) => {
				if ( ! cancelled ) {
					setError(
						reason.message ||
							__( 'The editor could not be loaded.', 'q2' )
					);
				}
			} );
		return () => {
			cancelled = true;
		};
	}, [ postId, postType ] );

	useEffect( () => {
		function handleMessage( event ) {
			if ( event.origin !== window.location.origin ) {
				return;
			}
			const data = event.data;
			if ( ! data || data.source !== 'q2-embed' ) {
				return;
			}

			if ( data.type === 'ready' ) {
				setReady( true );
			} else if ( data.type === 'save:done' && onSaved ) {
				onSaved( { postId: data.postId } );
			} else if ( data.type === 'close:requested' && onClose ) {
				onClose();
			}
		}

		window.addEventListener( 'message', handleMessage );
		return () => window.removeEventListener( 'message', handleMessage );
	}, [ onClose, onSaved ] );

	useEffect( () => {
		if ( ! ready || ! wrapperRef.current ) {
			return undefined;
		}
		const handleKey = ( event ) => {
			if ( 'Escape' === event.key && onClose ) {
				onClose();
			}
		};
		document.addEventListener( 'keydown', handleKey );
		wrapperRef.current.focus();
		return () => document.removeEventListener( 'keydown', handleKey );
	}, [ onClose, ready ] );

	const heading =
		title || ( isNew ? __( 'New post', 'q2' ) : __( 'Edit post', 'q2' ) );

	return (
		<div
			ref={ wrapperRef }
			className="q2-post-editor-iframe"
			role="dialog"
			aria-modal="true"
			aria-label={ heading }
			tabIndex="-1"
		>
			<header className="q2-post-editor-iframe-bar">
				<strong>{ heading }</strong>
				<button
					type="button"
					className="q2-post-editor-iframe-close"
					onClick={ onClose }
					aria-label={ __( 'Close editor', 'q2' ) }
				>
					{ __( 'Close', 'q2' ) }
				</button>
			</header>
			{ error && (
				<div className="q2-post-editor-iframe-error" role="alert">
					{ error }
				</div>
			) }
			{ ! error && ! url && (
				<div
					className="q2-post-editor-iframe-loading"
					aria-live="polite"
				>
					<Spinner />
					<span>{ __( 'Loading editor…', 'q2' ) }</span>
				</div>
			) }
			{ url && (
				<iframe
					className="q2-post-editor-iframe-frame"
					src={ url }
					title={ heading }
					onLoad={ () => setReady( true ) }
				/>
			) }
		</div>
	);
}
