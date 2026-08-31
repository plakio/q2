import apiFetch from '@wordpress/api-fetch';
import { useEffect, useId, useRef, useState } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import StateMessage from '../components/StateMessage';

const MIME_GROUPS = [
	{ key: '', label: __( 'All', 'q2' ) },
	{ key: 'image', label: __( 'Images', 'q2' ) },
	{ key: 'video', label: __( 'Video', 'q2' ) },
	{ key: 'audio', label: __( 'Audio', 'q2' ) },
	{ key: 'application', label: __( 'Files', 'q2' ) },
];

function formatDate( value ) {
	if ( ! value ) {
		return '';
	}
	return new Intl.DateTimeFormat( undefined, {
		dateStyle: 'medium',
	} ).format( new Date( value ) );
}

export default function MediaScreen() {
	const [ search, setSearch ] = useState( '' );
	const [ mime, setMime ] = useState( '' );
	const [ items, setItems ] = useState( [] );
	const [ page, setPage ] = useState( 1 );
	const [ totalPages, setTotalPages ] = useState( 1 );
	const [ status, setStatus ] = useState( 'loading' );
	const [ errorMessage, setErrorMessage ] = useState( '' );
	const [ selected, setSelected ] = useState( null );
	const fileRef = useRef( null );
	const [ uploading, setUploading ] = useState( 0 );
	const searchId = useId();
	const titleId = useId();
	const captionId = useId();
	const descriptionId = useId();

	const load = () => {
		setStatus( 'loading' );
		setErrorMessage( '' );
		const params = new URLSearchParams( {
			page: String( page ),
			perPage: '30',
		} );
		if ( search ) {
			params.set( 'search', search );
		}
		if ( mime ) {
			params.set( 'mime', mime + '%' );
		}
		apiFetch( { path: `/q2/v1/media?${ params.toString() }` } )
			.then( ( result ) => {
				setItems( result.items );
				setTotalPages( Math.max( result.totalPages, 1 ) );
				setStatus( 'ready' );
			} )
			.catch( ( reason ) => {
				setStatus( 'error' );
				setErrorMessage(
					reason.message || __( 'Media could not be loaded.', 'q2' )
				);
			} );
	};

	useEffect( () => {
		const timer = window.setTimeout( () => {
			load();
		}, 200 );
		return () => window.clearTimeout( timer );
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [ search, mime, page ] );

	const onUpload = async ( event ) => {
		const file = event.target.files?.[ 0 ];
		if ( ! file ) {
			return;
		}
		setUploading( ( value ) => value + 1 );
		setErrorMessage( '' );
		const formData = new FormData();
		formData.append( 'file', file );
		try {
			await apiFetch( {
				path: '/wp/v2/media',
				method: 'POST',
				body: formData,
			} );
			load();
		} catch ( reason ) {
			setErrorMessage(
				reason.message || __( 'The file could not be uploaded.', 'q2' )
			);
		} finally {
			setUploading( ( value ) => value - 1 );
			event.target.value = '';
		}
	};

	const saveSelected = async ( updates ) => {
		if ( ! selected ) {
			return;
		}
		try {
			const updated = await apiFetch( {
				path: `/q2/v1/media/${ selected.id }`,
				method: 'PATCH',
				data: updates,
			} );
			setSelected( updated );
			setItems( ( current ) =>
				current.map( ( item ) =>
					item.id === updated.id ? updated : item
				)
			);
		} catch ( reason ) {
			setErrorMessage(
				reason.message ||
					__( 'The file details could not be saved.', 'q2' )
			);
		}
	};

	const deleteSelected = async () => {
		if ( ! selected ) {
			return;
		}
		// eslint-disable-next-line no-alert
		if ( ! window.confirm( __( 'Delete this file?', 'q2' ) ) ) {
			return;
		}
		try {
			await apiFetch( {
				path: `/q2/v1/media/${ selected.id }`,
				method: 'DELETE',
			} );
			setSelected( null );
			load();
		} catch ( reason ) {
			setErrorMessage(
				reason.message || __( 'The file could not be deleted.', 'q2' )
			);
		}
	};

	const canUpload = window.q2Settings?.capabilities?.createPosts;

	return (
		<div className="q2-media-screen">
			<aside className="q2-media-side">
				<header className="q2-page-header">
					<div>
						<span className="q2-eyebrow">
							{ __( 'Workspace', 'q2' ) }
						</span>
						<h1>{ __( 'Media', 'q2' ) }</h1>
					</div>
					{ canUpload && (
						<>
							<button
								type="button"
								className="q2-media-upload"
								onClick={ () => fileRef.current?.click() }
								disabled={ uploading > 0 }
							>
								{ uploading > 0
									? __( 'Uploading…', 'q2' )
									: __( 'Upload', 'q2' ) }
							</button>
							<input
								ref={ fileRef }
								type="file"
								hidden
								onChange={ onUpload }
							/>
						</>
					) }
				</header>
				<label className="q2-media-search" htmlFor={ searchId }>
					<span className="screen-reader-text">
						{ __( 'Search media', 'q2' ) }
					</span>
					<input
						id={ searchId }
						type="search"
						value={ search }
						onChange={ ( event ) => {
							setPage( 1 );
							setSearch( event.target.value );
						} }
						placeholder={ __( 'Search media', 'q2' ) }
					/>
				</label>
				<div className="q2-media-filters">
					{ MIME_GROUPS.map( ( option ) => (
						<button
							key={ option.key }
							type="button"
							className={ mime === option.key ? 'is-active' : '' }
							onClick={ () => {
								setMime( option.key );
								setPage( 1 );
							} }
						>
							{ option.label }
						</button>
					) ) }
				</div>
				{ status === 'error' && <p role="alert">{ errorMessage }</p> }
				{ status === 'loading' && (
					<p>{ __( 'Loading media…', 'q2' ) }</p>
				) }
				{ status === 'ready' && items.length === 0 && (
					<StateMessage>
						<strong>{ __( 'No files match', 'q2' ) }</strong>
						<span>
							{ __(
								'Upload an attachment or refine your search.',
								'q2'
							) }
						</span>
					</StateMessage>
				) }
				{ status === 'ready' && items.length > 0 && (
					<ul className="q2-media-grid">
						{ items.map( ( item ) => (
							<li
								key={ item.id }
								className={
									selected?.id === item.id ? 'is-active' : ''
								}
							>
								<button
									type="button"
									onClick={ () => setSelected( item ) }
								>
									<span className="q2-media-thumb">
										{ item.isImage ? (
											<img
												src={
													item.sizes?.thumbnail
														?.url ||
													item.sizes?.medium?.url ||
													item.url
												}
												alt={ item.title }
											/>
										) : (
											<span className="q2-media-icon">
												{ item.mime
													.split( '/' )[ 1 ]
													?.toUpperCase() || 'FILE' }
											</span>
										) }
									</span>
									<strong>
										{ item.title || item.filename }
									</strong>
									<small>
										{ formatDate( item.dateGmt ) }
									</small>
								</button>
							</li>
						) ) }
					</ul>
				) }
				{ totalPages > 1 && (
					<nav className="q2-media-pagination">
						<button
							type="button"
							onClick={ () =>
								setPage( ( value ) => Math.max( 1, value - 1 ) )
							}
							disabled={ page <= 1 }
						>
							{ __( 'Previous', 'q2' ) }
						</button>
						<span>
							{ sprintf(
								/* translators: 1: current page, 2: total pages. */
								__( '%1$d of %2$d', 'q2' ),
								page,
								totalPages
							) }
						</span>
						<button
							type="button"
							onClick={ () =>
								setPage( ( value ) =>
									Math.min( totalPages, value + 1 )
								)
							}
							disabled={ page >= totalPages }
						>
							{ __( 'Next', 'q2' ) }
						</button>
					</nav>
				) }
			</aside>
			<section className="q2-media-detail">
				{ ! selected && (
					<StateMessage>
						<strong>{ __( 'Select a file', 'q2' ) }</strong>
						<span>
							{ __(
								'Pick an item on the left to view its details.',
								'q2'
							) }
						</span>
					</StateMessage>
				) }
				{ selected && (
					<article className="q2-media-pane">
						<header>
							<h2>{ selected.title || selected.filename }</h2>
							<p>
								{ sprintf(
									/* translators: 1: author, 2: date, 3: mime. */
									__(
										'Uploaded by %1$s on %2$s · %3$s',
										'q2'
									),
									selected.authorName ||
										__( 'Unknown', 'q2' ),
									formatDate( selected.dateGmt ),
									selected.mime
								) }
							</p>
							{ selected.isImage && (
								<img
									className="q2-media-preview"
									src={
										selected.sizes?.large?.url ||
										selected.url
									}
									alt={ selected.title }
								/>
							) }
						</header>
						{ selected.canEdit && (
							<form
								className="q2-media-form"
								onSubmit={ ( event ) => {
									event.preventDefault();
									const data = new window.FormData(
										event.currentTarget
									);
									saveSelected( {
										title: data.get( 'title' ),
										caption: data.get( 'caption' ),
										description: data.get( 'description' ),
									} );
								} }
							>
								<label htmlFor={ titleId }>
									<span>{ __( 'Title', 'q2' ) }</span>
									<input
										id={ titleId }
										type="text"
										name="title"
										defaultValue={ selected.title }
									/>
								</label>
								<label htmlFor={ captionId }>
									<span>{ __( 'Caption', 'q2' ) }</span>
									<input
										id={ captionId }
										type="text"
										name="caption"
										defaultValue={ selected.caption }
									/>
								</label>
								<label htmlFor={ descriptionId }>
									<span>{ __( 'Description', 'q2' ) }</span>
									<textarea
										id={ descriptionId }
										name="description"
										rows={ 3 }
										defaultValue={ selected.description }
									/>
								</label>
								<div>
									<button type="submit">
										{ __( 'Save details', 'q2' ) }
									</button>
									<a
										className="q2-media-open"
										href={ selected.url }
										target="_blank"
										rel="noopener noreferrer"
									>
										{ __( 'Open original', 'q2' ) }
									</a>
									{ selected.canDelete && (
										<button
											type="button"
											className="q2-media-delete"
											onClick={ deleteSelected }
										>
											{ __( 'Delete', 'q2' ) }
										</button>
									) }
								</div>
							</form>
						) }
					</article>
				) }
			</section>
		</div>
	);
}
