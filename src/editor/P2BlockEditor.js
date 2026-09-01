import apiFetch from '@wordpress/api-fetch';
import { useEffect, useMemo, useRef, useState } from '@wordpress/element';
import {
	Button,
	PanelBody,
	SelectControl,
	Spinner,
} from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import BlockContentEditor, { POST_BLOCKS } from './BlockContentEditor';
import TagPicker from '../components/TagPicker';

const STATUSES = [
	{ value: 'draft', label: () => __( 'Draft', 'q2' ) },
	{ value: 'pending', label: () => __( 'Pending review', 'q2' ) },
	{ value: 'private', label: () => __( 'Private', 'q2' ) },
	{ value: 'publish', label: () => __( 'Published', 'q2' ) },
];

export default function P2BlockEditor( {
	postId = 0,
	onClose,
	onSaved,
	submitLabel,
	onOpenFullEditor,
} ) {
	const [ record, setRecord ] = useState( null );
	const [ loading, setLoading ] = useState( postId > 0 );
	const [ error, setError ] = useState( '' );
	const [ status, setStatus ] = useState(
		globalThis.q2Settings?.capabilities?.publishPosts
			? 'publish'
			: 'pending'
	);
	const [ tags, setTags ] = useState( [] );
	const [ message, setMessage ] = useState( '' );
	const [ busy, setBusy ] = useState( false );
	const draftIdRef = useRef( 0 );

	useEffect( () => {
		if ( ! postId ) {
			return undefined;
		}
		let cancelled = false;
		setLoading( true );
		apiFetch( { path: `/wp/v2/posts/${ postId }?context=edit` } )
			.then( ( data ) => {
				if ( cancelled ) {
					return;
				}
				setRecord( data );
				setStatus( data.status || 'draft' );
				setTags( data.tags || [] );
				setLoading( false );
			} )
			.catch( ( reason ) => {
				if ( cancelled ) {
					return;
				}
				setError(
					reason.message ||
						__( 'The post could not be loaded.', 'q2' )
				);
				setLoading( false );
			} );
		return () => {
			cancelled = true;
		};
	}, [ postId ] );

	const save = async ( content ) => {
		setBusy( true );
		setMessage( '' );
		try {
			const payload = {
				content,
				status,
				tags,
			};
			const result = postId
				? await apiFetch( {
						path: `/wp/v2/posts/${ postId }`,
						method: 'PATCH',
						data: payload,
				  } )
				: await apiFetch( {
						path: '/wp/v2/posts',
						method: 'POST',
						data: payload,
				  } );
			onSaved?.( result );
		} catch ( reason ) {
			setMessage(
				reason.message || __( 'The post could not be saved.', 'q2' )
			);
		} finally {
			setBusy( false );
		}
	};

	const resolvedSubmitLabel = useMemo( () => {
		if ( submitLabel ) {
			return submitLabel;
		}
		if ( postId ) {
			return __( 'Update', 'q2' );
		}
		return globalThis.q2Settings?.capabilities?.publishPosts
			? __( 'Publish', 'q2' )
			: __( 'Submit for review', 'q2' );
	}, [ postId, submitLabel ] );

	const openFullEditor = async ( content ) => {
		if ( ! onOpenFullEditor ) {
			return;
		}
		setBusy( true );
		setMessage( '' );
		try {
			const targetId = postId || draftIdRef.current;
			let savedId = targetId;
			if ( targetId ) {
				const result = await apiFetch( {
					path: `/wp/v2/posts/${ targetId }`,
					method: 'PATCH',
					data: { content, tags },
				} );
				savedId = result.id || targetId;
			} else {
				const result = await apiFetch( {
					path: '/wp/v2/posts',
					method: 'POST',
					data: { content, tags, status: 'draft' },
				} );
				savedId = result.id;
				draftIdRef.current = savedId;
			}
			onOpenFullEditor( savedId );
		} catch ( reason ) {
			setMessage(
				reason.message || __( 'The post could not be saved.', 'q2' )
			);
		} finally {
			setBusy( false );
		}
	};

	const settingsChildren = (
		<>
			<PanelBody title={ __( 'Status & visibility', 'q2' ) } initialOpen>
				<SelectControl
					label={ __( 'Visibility', 'q2' ) }
					value={ status }
					options={ STATUSES.map( ( item ) => ( {
						value: item.value,
						label: item.label(),
					} ) ) }
					onChange={ setStatus }
				/>
			</PanelBody>
			<PanelBody title={ __( 'Tags', 'q2' ) } initialOpen>
				<TagPicker value={ tags } onChange={ setTags } />
			</PanelBody>
		</>
	);

	if ( loading ) {
		return (
			<div className="q2-p2-editor is-loading">
				<Spinner />
				<span>{ __( 'Loading editor…', 'q2' ) }</span>
			</div>
		);
	}

	if ( error ) {
		return (
			<div className="q2-p2-editor is-error" role="alert">
				<p>{ error }</p>
				<Button variant="tertiary" onClick={ onClose }>
					{ __( 'Close', 'q2' ) }
				</Button>
			</div>
		);
	}

	return (
		<BlockContentEditor
			variant="p2"
			allowedBlocks={ POST_BLOCKS }
			initialContent={ record?.content?.raw || '' }
			onSave={ save }
			onCancel={ onClose }
			submitLabel={ busy ? __( 'Saving…', 'q2' ) : resolvedSubmitLabel }
			settingsChildren={ settingsChildren }
			statusText={ message }
			onOpenFullEditor={ onOpenFullEditor ? openFullEditor : null }
		/>
	);
}
