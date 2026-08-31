import apiFetch from '@wordpress/api-fetch';
import {
	createRoot,
	useCallback,
	useEffect,
	useMemo,
	useState,
} from '@wordpress/element';
import { __, _n, sprintf } from '@wordpress/i18n';
import {
	Icon,
	bell,
	chevronDown,
	comment,
	menu,
	pages,
	people,
	postList,
	search,
	starEmpty,
} from '@wordpress/icons';
import CommentsThread from './comments/CommentsThread';
import TagPicker from './components/TagPicker';
import BlockContentEditor, { POST_BLOCKS } from './editor/BlockContentEditor';
import PeopleScreen from './people/PeopleScreen';
import { routeFromHash, routeFromPath } from './routes';
import './style.scss';

const settings = window.q2Settings || {};
apiFetch.use( apiFetch.createNonceMiddleware( settings.restNonce ) );
apiFetch.use( apiFetch.createRootURLMiddleware( settings.restRoot ) );

const routes = [
	{ key: 'feed', label: __( 'Posts', 'q2' ), icon: postList, sidebar: true },
	{ key: 'pages', label: __( 'Pages', 'q2' ), icon: pages, sidebar: true },
	{ key: 'notifications', label: __( 'Notifications', 'q2' ), icon: bell },
	{ key: 'search', label: __( 'Search', 'q2' ), icon: search },
	{ key: 'projects', label: __( 'Projects', 'q2' ), icon: postList },
	{ key: 'people', label: __( 'People', 'q2' ), icon: people },
];

function routeFromLocation() {
	if ( window.location.hash ) {
		return routeFromHash( window.location.hash );
	}

	const homePath = new URL(
		settings.homeUrl,
		window.location.origin
	).pathname.replace( /\/$/, '' );
	if ( window.location.pathname.replace( /\/$/, '' ) === homePath ) {
		return 'feed';
	}

	return routeFromPath(
		settings.appUrl,
		window.location.pathname,
		window.location.origin
	);
}

function App() {
	const [ route, setRoute ] = useState( routeFromLocation );
	const [ menuOpen, setMenuOpen ] = useState( false );

	useEffect( () => {
		const onPopState = () => setRoute( routeFromLocation() );
		window.addEventListener( 'popstate', onPopState );
		return () => window.removeEventListener( 'popstate', onPopState );
	}, [] );

	const goToRoute = useCallback( ( nextRoute ) => {
		const nextUrl =
			nextRoute === 'feed'
				? settings.homeUrl
				: `${ settings.homeUrl }#${ nextRoute }`;
		window.history.pushState( {}, '', nextUrl );
		setRoute( nextRoute );
		setMenuOpen( false );
		document.querySelector( '#q2-main' )?.focus();
	}, [] );

	const navigate = useCallback(
		( event, nextRoute ) => {
			if (
				event.button !== 0 ||
				event.metaKey ||
				event.ctrlKey ||
				event.shiftKey ||
				event.altKey
			) {
				return;
			}
			event.preventDefault();
			goToRoute( nextRoute );
		},
		[ goToRoute ]
	);

	const known = routes.some( ( item ) => item.key === route );
	let content = <ComingSoon route={ route } />;
	if ( ! known ) {
		content = <NotFound />;
	} else if ( route === 'feed' ) {
		content = <Feed />;
	} else if ( route === 'people' ) {
		content = <PeopleScreen />;
	}

	return (
		<div className={ `q2-app${ menuOpen ? ' is-menu-open' : '' }` }>
			<Topbar
				onNavigate={ goToRoute }
				onToggleMenu={ () => setMenuOpen( ( value ) => ! value ) }
			/>
			<aside
				className="q2-sidebar"
				aria-label={ __( 'Workspace navigation', 'q2' ) }
			>
				<WorkspaceSummary />
				<nav className="q2-navigation">
					{ routes
						.filter( ( item ) => item.sidebar )
						.map( ( item ) => (
							<a
								key={ item.key }
								className={
									route === item.key ? 'is-active' : ''
								}
								aria-current={
									route === item.key ? 'page' : undefined
								}
								href={
									item.key === 'feed'
										? settings.homeUrl
										: `${ settings.homeUrl }#${ item.key }`
								}
								onClick={ ( event ) =>
									navigate( event, item.key )
								}
							>
								<Icon icon={ item.icon } size={ 20 } />
								<span>{ item.label }</span>
							</a>
						) ) }
				</nav>
				<Team />
				<div className="q2-sidebar-footer">
					{ __( 'Powered by WordPress · Q2', 'q2' ) }
				</div>
			</aside>
			<main id="q2-main" className="q2-main" tabIndex="-1">
				{ content }
			</main>
		</div>
	);
}

function SiteIcon( { className = '' } ) {
	if ( settings.siteIconUrl ) {
		return (
			<img className={ className } src={ settings.siteIconUrl } alt="" />
		);
	}

	return (
		<span className={ className } aria-hidden="true">
			{ settings.siteName?.trim().charAt( 0 ) || 'Q' }
		</span>
	);
}

function Topbar( { onNavigate, onToggleMenu } ) {
	const user = settings.currentUser || {};
	return (
		<header className="q2-topbar">
			<a className="q2-product" href={ settings.homeUrl }>
				<span className="q2-product-symbol" aria-hidden="true">
					Q
				</span>
				<strong>Q2</strong>
			</a>
			<button className="q2-workspace-switcher" type="button">
				<SiteIcon className="q2-topbar-site-icon" />
				<strong>{ settings.siteName || 'Q2' }</strong>
				<Icon icon={ chevronDown } size={ 18 } />
			</button>
			<form
				className="q2-global-search"
				onSubmit={ ( event ) => {
					event.preventDefault();
					onNavigate( 'search' );
				} }
			>
				<Icon icon={ search } size={ 20 } />
				<input
					type="search"
					aria-label={ __( 'Search workspace', 'q2' ) }
					placeholder={ sprintf(
						/* translators: %s: workspace name. */
						__( 'Search in %s', 'q2' ),
						settings.siteName || 'Q2'
					) }
				/>
			</form>
			<button
				className="q2-topbar-action"
				type="button"
				onClick={ () => onNavigate( 'notifications' ) }
				aria-label={ __( 'Notifications', 'q2' ) }
			>
				<Icon icon={ bell } size={ 21 } />
			</button>
			<img className="q2-topbar-avatar" src={ user.avatarUrl } alt="" />
			<button
				className="q2-mobile-menu"
				type="button"
				onClick={ onToggleMenu }
				aria-label={ __( 'Toggle navigation', 'q2' ) }
			>
				<Icon icon={ menu } size={ 22 } />
			</button>
		</header>
	);
}

function WorkspaceSummary() {
	return (
		<div className="q2-workspace-summary">
			<div className="q2-workspace-cover" />
			<div className="q2-workspace-details">
				<SiteIcon className="q2-workspace-icon" />
				<h1>{ settings.siteName || 'Q2' }</h1>
				<p>
					{ settings.siteDescription ||
						__( 'A collaborative workspace.', 'q2' ) }
				</p>
			</div>
		</div>
	);
}

function Team() {
	const [ members, setMembers ] = useState( [] );

	useEffect( () => {
		let active = true;
		apiFetch( { path: '/q2/v1/people' } )
			.then( ( result ) => active && setMembers( result.slice( 0, 15 ) ) )
			.catch( () => {} );
		return () => {
			active = false;
		};
	}, [] );

	return (
		<section className="q2-team" aria-label={ __( 'Team', 'q2' ) }>
			<header>
				<h2>{ __( 'Team', 'q2' ) }</h2>
				<span aria-hidden="true">•••</span>
			</header>
			<div className="q2-team-avatars">
				{ members.map( ( member ) => (
					<img
						key={ member.id }
						src={ member.avatarUrl }
						alt={ member.name }
						title={ member.name }
					/>
				) ) }
			</div>
		</section>
	);
}

function Feed() {
	const [ posts, setPosts ] = useState( [] );
	const [ status, setStatus ] = useState( 'loading' );
	const [ error, setError ] = useState( '' );
	const [ refresh, setRefresh ] = useState( 0 );
	const [ page, setPage ] = useState( 1 );
	const [ hasMore, setHasMore ] = useState( true );
	const perPage = 10;

	useEffect( () => {
		let active = true;
		setStatus( page === 1 ? 'loading' : 'loading-more' );
		const context = settings.capabilities?.createPosts
			? '&context=edit'
			: '';
		apiFetch( {
			path: `/wp/v2/posts?per_page=${ perPage }&page=${ page }&_embed=author,wp:term,replies${ context }`,
		} )
			.then( ( result ) => {
				if ( active ) {
					setPosts( ( current ) =>
						page === 1 ? result : [ ...current, ...result ]
					);
					setHasMore( result.length === perPage );
					setStatus( 'ready' );
				}
			} )
			.catch( ( reason ) => {
				if ( active ) {
					setError(
						reason.message ||
							__( 'The feed could not be loaded.', 'q2' )
					);
					setStatus( 'error' );
				}
			} );
		return () => {
			active = false;
		};
	}, [ page, refresh ] );

	const reload = useCallback( () => {
		setPage( 1 );
		setRefresh( ( value ) => value + 1 );
	}, [] );

	const updatePost = useCallback( ( updated ) => {
		setPosts( ( current ) =>
			current.map( ( item ) =>
				item.id === updated.id ? updated : item
			)
		);
	}, [] );

	return (
		<div className="q2-feed">
			{ settings.capabilities?.createPosts && (
				<Composer onCreated={ reload } />
			) }
			<div className="q2-feed-tools">
				<button type="button">
					{ __( 'Filters', 'q2' ) }
					<Icon icon={ chevronDown } size={ 17 } />
				</button>
				<button type="button">
					{ __( 'Default view', 'q2' ) }
					<Icon icon={ chevronDown } size={ 17 } />
				</button>
			</div>
			<div className="q2-feed-content">
				{ status === 'loading' && (
					<StateMessage>
						{ __( 'Loading updates…', 'q2' ) }
					</StateMessage>
				) }
				{ status === 'error' && (
					<StateMessage>
						<strong>{ __( 'Something went wrong', 'q2' ) }</strong>
						<span>{ error }</span>
						<button onClick={ () => reload() }>
							{ __( 'Try again', 'q2' ) }
						</button>
					</StateMessage>
				) }
				{ status === 'ready' && posts.length === 0 && (
					<StateMessage>
						<strong>
							{ __( 'Start the conversation', 'q2' ) }
						</strong>
						<span>
							{ __(
								'Publish the first update for this workspace.',
								'q2'
							) }
						</span>
					</StateMessage>
				) }
				{ status === 'ready' &&
					posts.map( ( post ) => (
						<Post
							key={ post.id }
							post={ post }
							onUpdated={ updatePost }
						/>
					) ) }
				{ status === 'loading-more' && (
					<p className="q2-load-more-status">
						{ __( 'Loading more…', 'q2' ) }
					</p>
				) }
				{ status === 'ready' && hasMore && posts.length > 0 && (
					<button
						className="q2-load-more"
						type="button"
						onClick={ () => setPage( ( value ) => value + 1 ) }
					>
						{ __( 'Load more updates', 'q2' ) }
					</button>
				) }
			</div>
		</div>
	);
}

function Composer( { onCreated } ) {
	const [ message, setMessage ] = useState( '' );
	const [ expanded, setExpanded ] = useState( false );
	const [ tags, setTags ] = useState( [] );
	const avatar = settings.currentUser?.avatarUrl;

	const publish = async ( content ) => {
		setMessage( '' );
		await apiFetch( {
			path: '/wp/v2/posts',
			method: 'POST',
			data: {
				content,
				tags,
				status: settings.capabilities?.publishPosts
					? 'publish'
					: 'pending',
			},
		} );
		setTags( [] );
		setExpanded( false );
		setMessage(
			settings.capabilities?.publishPosts
				? __( 'Update published.', 'q2' )
				: __( 'Update submitted for review.', 'q2' )
		);
		onCreated();
	};

	return (
		<section className={ `q2-composer${ expanded ? ' is-expanded' : '' }` }>
			<div className="q2-composer-inner">
				<img src={ avatar } alt="" />
				<div className="q2-composer-field">
					<span className="q2-composer-now">
						{ __( 'Now', 'q2' ) }
					</span>
					{ expanded ? (
						<>
							<BlockContentEditor
								allowedBlocks={ POST_BLOCKS }
								onSave={ publish }
								onCancel={ () => setExpanded( false ) }
								submitLabel={ __( 'Post', 'q2' ) }
							/>
							<TagPicker value={ tags } onChange={ setTags } />
						</>
					) : (
						<button
							type="button"
							className="q2-composer-prompt"
							onClick={ () => setExpanded( true ) }
						>
							{ sprintf(
								/* translators: %s: current user's display name. */
								__(
									'Hi, %s! Post an update, ask a question, or brainstorm ideas.',
									'q2'
								),
								settings.currentUser?.name ||
									__( 'there', 'q2' )
							) }
						</button>
					) }
				</div>
			</div>
			<footer>
				<span aria-live="polite">{ message }</span>
			</footer>
		</section>
	);
}

function Post( { post, onUpdated } ) {
	const author = post._embedded?.author?.[ 0 ];
	const [ commentsOpen, setCommentsOpen ] = useState( false );
	const [ editing, setEditing ] = useState( false );
	const [ replyCount, setReplyCount ] = useState(
		post._embedded?.replies?.[ 0 ]?.length || 0
	);
	const updateReplyCount = useCallback(
		( count ) => setReplyCount( count ),
		[]
	);
	const canEdit =
		post.author === settings.currentUser?.id ||
		settings.capabilities?.editOthersPosts;
	const terms = ( post._embedded?.[ 'wp:term' ] || [] ).flat();
	const tagTerms = terms.filter( ( term ) => term.taxonomy === 'post_tag' );
	const [ selectedTags, setSelectedTags ] = useState(
		post.tags || tagTerms.map( ( term ) => term.id )
	);
	const replyLabel = sprintf(
		/* translators: %d: number of replies to a post. */
		_n( '%d reply', '%d replies', replyCount, 'q2' ),
		replyCount
	);
	const date = useMemo(
		() =>
			new Intl.DateTimeFormat( undefined, {
				dateStyle: 'medium',
				timeStyle: 'short',
			} ).format( new Date( post.date_gmt + 'Z' ) ),
		[ post.date_gmt ]
	);

	const saveEdit = async ( content ) => {
		const updated = await apiFetch( {
			path: `/wp/v2/posts/${ post.id }?context=edit`,
			method: 'PATCH',
			data: { content, tags: selectedTags },
		} );
		onUpdated( {
			...post,
			...updated,
			_embedded: post._embedded,
		} );
		setEditing( false );
	};

	return (
		<article className="q2-post">
			{ canEdit && ! editing && (
				<button
					className="q2-post-menu"
					type="button"
					onClick={ () => setEditing( true ) }
				>
					{ __( 'Edit', 'q2' ) }
				</button>
			) }
			{ post.title?.rendered && (
				<h2
					dangerouslySetInnerHTML={ { __html: post.title.rendered } }
				/>
			) }
			<header>
				<img src={ author?.avatar_urls?.[ 48 ] } alt="" />
				<div>
					<strong>
						{ author?.name || __( 'Unknown author', 'q2' ) }
					</strong>
					<time dateTime={ post.date_gmt + 'Z' }>{ date }</time>
				</div>
			</header>
			{ editing ? (
				<div className="q2-post-editor">
					<BlockContentEditor
						initialContent={
							post.content.raw || post.content.rendered
						}
						allowedBlocks={ POST_BLOCKS }
						onSave={ saveEdit }
						onCancel={ () => setEditing( false ) }
						submitLabel={ __( 'Save update', 'q2' ) }
					/>
					<TagPicker
						value={ selectedTags }
						onChange={ setSelectedTags }
					/>
				</div>
			) : (
				<div
					className="q2-post-content"
					dangerouslySetInnerHTML={ {
						__html: post.content.rendered,
					} }
				/>
			) }
			{ tagTerms.length > 0 && ! editing && (
				<ul className="q2-post-tags" aria-label={ __( 'Tags', 'q2' ) }>
					{ tagTerms.map( ( term ) => (
						<li key={ term.id }>{ term.name }</li>
					) ) }
				</ul>
			) }
			<footer>
				<button
					type="button"
					onClick={ () => setCommentsOpen( ( value ) => ! value ) }
					aria-expanded={ commentsOpen }
				>
					<Icon icon={ comment } size={ 18 } />
					{ replyLabel }
				</button>
				<button type="button">
					<Icon icon={ bell } size={ 18 } />
					{ __( 'Follow', 'q2' ) }
				</button>
				<button type="button">
					<Icon icon={ starEmpty } size={ 18 } />
					{ __( 'Like', 'q2' ) }
				</button>
			</footer>
			{ commentsOpen && (
				<CommentsThread
					postId={ post.id }
					onCountChange={ updateReplyCount }
				/>
			) }
		</article>
	);
}

function ComingSoon( { route } ) {
	const label = routes.find( ( item ) => item.key === route )?.label || route;
	return (
		<div className="q2-column">
			<header className="q2-page-header">
				<div>
					<span className="q2-eyebrow">
						{ __( 'Q2 foundation', 'q2' ) }
					</span>
					<h1>{ label }</h1>
				</div>
			</header>
			<StateMessage>
				<strong>
					{ __( 'This area is architected and coming next.', 'q2' ) }
				</strong>
				<span>
					{ __(
						'The foundation milestone establishes navigation without pretending unfinished collaboration features are complete.',
						'q2'
					) }
				</span>
			</StateMessage>
		</div>
	);
}

function NotFound() {
	return (
		<div className="q2-column">
			<StateMessage>
				<strong>{ __( 'Page not found', 'q2' ) }</strong>
				<a href={ settings.homeUrl }>
					{ __( 'Return to the feed', 'q2' ) }
				</a>
			</StateMessage>
		</div>
	);
}
function StateMessage( { children } ) {
	return (
		<div className="q2-state" role="status">
			{ children }
		</div>
	);
}

const root = document.getElementById( 'q2-root' );
if ( root ) {
	createRoot( root ).render( <App /> );
}
