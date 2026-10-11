import apiFetch from '@wordpress/api-fetch';
import { useEffect, useRef, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { Spinner } from '@wordpress/components';

async function fetchEditorUrl( {
	postId,
	postType,
	variant,
	allowFullEditor,
} ) {
	const path =
		postId > 0
			? `/q2/v1/editor-url?post_id=${ postId }&mode=${ variant }`
			: `/q2/v1/editor-url?post_type=${
					postType || 'post'
			  }&mode=${ variant }`;
	const response = await apiFetch( { path } );
	const url = response?.url || '';
	const viewUrl = response?.viewUrl || '';
	// Carry embed flags in the fragment: wp-admin rewrites the iframe query
	// string to its canonical form shortly after load, but preserves the
	// hash.
	const params = new URLSearchParams();
	if ( viewUrl ) {
		params.set( 'q2_view', viewUrl );
	}
	if ( allowFullEditor ) {
		params.set( 'q2_fullscreen', '1' );
	}
	const query = params.toString();
	if ( query && ! url.includes( '#' ) ) {
		return { url: `${ url }#${ query }` };
	}
	return { url };
}

export default function PostEditorIframe( {
	postId = 0,
	postType = 'post',
	isNew = false,
	onClose,
	onSaved,
	onOpenInFullEditor,
	allowFullEditor = false,
	title,
	variant = 'embedded',
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
		fetchEditorUrl( { postId, postType, variant, allowFullEditor } )
			.then( ( resolved ) => {
				if ( ! cancelled ) {
					setUrl( resolved?.url || '' );
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
	}, [ postId, postType, variant, allowFullEditor ] );

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
			} else if (
				data.type === 'open:fullscreen' &&
				onOpenInFullEditor
			) {
				onOpenInFullEditor( data.postId || postId );
			} else if ( data.type === 'close:requested' && onClose ) {
				onClose();
			}
		}

		window.addEventListener( 'message', handleMessage );
		return () => window.removeEventListener( 'message', handleMessage );
	}, [ onClose, onSaved, onOpenInFullEditor, postId ] );

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
			className={ `q2-post-editor-iframe is-${ variant }` }
			role="dialog"
			aria-modal="true"
			aria-label={ heading }
			tabIndex="-1"
		>
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
