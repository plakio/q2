import apiFetch from '@wordpress/api-fetch';
import { useEffect, useId, useMemo, useState } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import PostEditorIframe from '../editor/PostEditorIframe';
import StateMessage from '../components/StateMessage';

function TreeNode( { node, onSelect, activeId, expanded, onToggle } ) {
	const hasChildren = node.children && node.children.length > 0;
	const isOpen = expanded.has( node.id );
	return (
		<li className="q2-page-tree-item">
			<div
				className={ `q2-page-tree-row${
					node.id === activeId ? ' is-active' : ''
				}` }
			>
				{ hasChildren && (
					<button
						type="button"
						className="q2-page-tree-toggle"
						aria-expanded={ isOpen }
						aria-label={
							isOpen
								? __( 'Collapse', 'q2' )
								: __( 'Expand', 'q2' )
						}
						onClick={ () => onToggle( node.id ) }
					>
						{ isOpen ? '▾' : '▸' }
					</button>
				) }
				{ ! hasChildren && (
					<span className="q2-page-tree-toggle" aria-hidden="true" />
				) }
				<button
					type="button"
					className="q2-page-tree-link"
					onClick={ () => onSelect( node.id ) }
				>
					<strong>{ node.title || __( '(Untitled)', 'q2' ) }</strong>
					{ node.status === 'draft' && (
						<span className="q2-page-draft-pill">
							{ __( 'Draft', 'q2' ) }
						</span>
					) }
					{ node.status === 'private' && (
						<span className="q2-page-draft-pill">
							{ __( 'Private', 'q2' ) }
						</span>
					) }
				</button>
			</div>
			{ hasChildren && isOpen && (
				<ul className="q2-page-tree-children">
					{ node.children.map( ( child ) => (
						<TreeNode
							key={ child.id }
							node={ child }
							onSelect={ onSelect }
							activeId={ activeId }
							expanded={ expanded }
							onToggle={ onToggle }
						/>
					) ) }
				</ul>
			) }
		</li>
	);
}

export default function PagesScreen() {
	const [ tree, setTree ] = useState( [] );
	const [ recents, setRecents ] = useState( [] );
	const [ status, setStatus ] = useState( 'loading' );
	const [ error, setError ] = useState( '' );
	const [ search, setSearch ] = useState( '' );
	const [ selectedId, setSelectedId ] = useState( 0 );
	const [ pageData, setPageData ] = useState( null );
	const [ pageStatus, setPageStatus ] = useState( 'idle' );
	const [ editing, setEditing ] = useState( false );
	const [ creating, setCreating ] = useState( false );
	const [ expanded, setExpanded ] = useState( () => new Set() );
	const searchId = useId();

	const reload = () => {
		setStatus( 'loading' );
		apiFetch( {
			path: `/q2/v1/pages${
				search ? `?search=${ encodeURIComponent( search ) }` : ''
			}`,
		} )
			.then( ( result ) => {
				setTree( result.tree );
				setRecents( result.recents );
				setStatus( 'ready' );
			} )
			.catch( ( reason ) => {
				setError(
					reason.message || __( 'Pages could not be loaded.', 'q2' )
				);
				setStatus( 'error' );
			} );
	};

	useEffect( () => {
		const timer = window.setTimeout( reload, 250 );
		return () => window.clearTimeout( timer );
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [ search ] );

	useEffect( () => {
		if ( ! selectedId ) {
			setPageData( null );
			return undefined;
		}
		setPageStatus( 'loading' );
		apiFetch( { path: `/q2/v1/pages/${ selectedId }` } )
			.then( ( result ) => {
				setPageData( result );
				setPageStatus( 'ready' );
				setEditing( false );
			} )
			.catch( ( reason ) => {
				setPageStatus( 'error' );
				setError(
					reason.message ||
						__( 'The page could not be loaded.', 'q2' )
				);
			} );
		return undefined;
	}, [ selectedId ] );

	const selectFromTree = ( id ) => {
		setSelectedId( id );
		setExpanded( ( prev ) => {
			const next = new Set( prev );
			next.add( id );
			return next;
		} );
	};

	const toggleExpand = ( id ) => {
		setExpanded( ( prev ) => {
			const next = new Set( prev );
			if ( next.has( id ) ) {
				next.delete( id );
			} else {
				next.add( id );
			}
			return next;
		} );
	};

	const publish = async ( next ) => {
		await apiFetch( {
			path: `/q2/v1/pages/${ selectedId }`,
			method: 'PATCH',
			data: { status: next },
		} );
		setPageData( ( prev ) => ( prev ? { ...prev, status: next } : prev ) );
		reload();
	};

	const trashPage = async () => {
		// eslint-disable-next-line no-alert
		if ( ! window.confirm( __( 'Move this page to trash?', 'q2' ) ) ) {
			return;
		}
		await apiFetch( {
			path: `/q2/v1/pages/${ selectedId }`,
			method: 'DELETE',
		} );
		setSelectedId( 0 );
		setPageData( null );
		reload();
	};

	const startCreate = () => {
		setSelectedId( 0 );
		setEditing( false );
		setCreating( true );
	};

	const dated = useMemo(
		() => ( d ) =>
			new Intl.DateTimeFormat( undefined, {
				dateStyle: 'medium',
			} ).format( new Date( d ) ),
		[]
	);

	return (
		<div className="q2-pages-screen">
			<aside className="q2-pages-side">
				<header className="q2-page-header">
					<div>
						<span className="q2-eyebrow">
							{ __( 'Workspace', 'q2' ) }
						</span>
						<h1>{ __( 'Pages', 'q2' ) }</h1>
					</div>
					<button
						type="button"
						className="q2-pages-create"
						onClick={ startCreate }
					>
						{ __( 'New page', 'q2' ) }
					</button>
				</header>
				<label className="q2-pages-search" htmlFor={ searchId }>
					<span className="screen-reader-text">
						{ __( 'Search pages', 'q2' ) }
					</span>
					<input
						id={ searchId }
						type="search"
						value={ search }
						onChange={ ( event ) =>
							setSearch( event.target.value )
						}
						placeholder={ __( 'Search pages', 'q2' ) }
					/>
				</label>
				{ status === 'loading' && (
					<p>{ __( 'Loading pages…', 'q2' ) }</p>
				) }
				{ status === 'error' && <p role="alert">{ error }</p> }
				{ status === 'ready' && tree.length === 0 && (
					<StateMessage>
						<strong>{ __( 'No pages yet', 'q2' ) }</strong>
						<span>
							{ __(
								'Create durable documents, plans, and onboarding guides.',
								'q2'
							) }
						</span>
					</StateMessage>
				) }
				{ status === 'ready' && tree.length > 0 && (
					<ul className="q2-page-tree">
						{ tree.map( ( node ) => (
							<TreeNode
								key={ node.id }
								node={ node }
								onSelect={ selectFromTree }
								activeId={ selectedId }
								expanded={ expanded }
								onToggle={ toggleExpand }
							/>
						) ) }
					</ul>
				) }
				{ recents.length > 0 && (
					<section className="q2-pages-recents">
						<h2>{ __( 'Recently edited', 'q2' ) }</h2>
						<ul>
							{ recents.map( ( item ) => (
								<li key={ item.id }>
									<button
										type="button"
										onClick={ () =>
											setSelectedId( item.id )
										}
									>
										<strong>
											{ item.title ||
												__( '(Untitled)', 'q2' ) }
										</strong>
										<small>
											{ sprintf(
												/* translators: 1: author display name, 2: modified date. */
												__( '%1$s · %2$s', 'q2' ),
												item.authorName ||
													__( 'Unknown', 'q2' ),
												dated( item.modified )
											) }
										</small>
									</button>
								</li>
							) ) }
						</ul>
					</section>
				) }
			</aside>
			<section className="q2-pages-reader">
				{ creating && (
					<PostEditorIframe
						postType="page"
						isNew
						title={ __( 'New page', 'q2' ) }
						onClose={ () => setCreating( null ) }
						onSaved={ () => {
							setCreating( null );
							reload();
						} }
					/>
				) }
				{ ! creating && ! selectedId && (
					<StateMessage>
						<strong>{ __( 'Select a page', 'q2' ) }</strong>
						<span>
							{ __(
								'Pick a document from the tree to read or edit it.',
								'q2'
							) }
						</span>
					</StateMessage>
				) }
				{ ! creating &&
					Boolean( selectedId ) &&
					pageStatus === 'loading' && (
						<p>{ __( 'Loading page…', 'q2' ) }</p>
					) }
				{ ! creating && Boolean( selectedId ) && pageData && (
					<article className="q2-page-article">
						<header>
							{ pageData.parents?.length > 0 && (
								<nav
									className="q2-page-crumbs"
									aria-label={ __( 'Breadcrumb', 'q2' ) }
								>
									{ pageData.parents
										.filter( Boolean )
										.map( ( crumb ) => (
											<span key={ crumb.id }>
												{ crumb.title }
											</span>
										) ) }
								</nav>
							) }
							{ ! editing && (
								<h1>
									{ pageData.title ||
										__( '(Untitled)', 'q2' ) }
								</h1>
							) }
							{ ! editing && (
								<p className="q2-page-meta">
									{ sprintf(
										/* translators: 1: author display name, 2: creation date. */
										__( 'By %1$s on %2$s', 'q2' ),
										pageData.authorName ||
											__( 'Unknown', 'q2' ),
										dated( pageData.dateGmt )
									) }
								</p>
							) }
							{ ! editing && pageData.canEdit && (
								<div className="q2-page-actions">
									<button
										type="button"
										onClick={ () => setEditing( true ) }
									>
										{ __( 'Edit', 'q2' ) }
									</button>
									{ pageData.canPublish &&
										pageData.status !== 'publish' && (
											<button
												type="button"
												onClick={ () =>
													publish( 'publish' )
												}
											>
												{ __( 'Publish', 'q2' ) }
											</button>
										) }
									{ pageData.canPublish &&
										pageData.status === 'publish' && (
											<button
												type="button"
												onClick={ () =>
													publish( 'draft' )
												}
											>
												{ __( 'Move to draft', 'q2' ) }
											</button>
										) }
									{ pageData.canDelete && (
										<button
											type="button"
											className="q2-page-delete"
											onClick={ trashPage }
										>
											{ __( 'Delete', 'q2' ) }
										</button>
									) }
								</div>
							) }
						</header>
						{ editing ? (
							<PostEditorIframe
								postId={ selectedId }
								postType="page"
								title={ __( 'Edit page', 'q2' ) }
								onClose={ () => setEditing( false ) }
								onSaved={ () => {
									setEditing( false );
									reload();
									apiFetch( {
										path: `/q2/v1/pages/${ selectedId }`,
									} ).then( ( next ) => {
										setPageData( next );
										setPageStatus( 'ready' );
									} );
								} }
							/>
						) : (
							<div
								className="q2-page-content"
								dangerouslySetInnerHTML={ {
									__html: pageData.rendered,
								} }
							/>
						) }
					</article>
				) }
			</section>
		</div>
	);
}
