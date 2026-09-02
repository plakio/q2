import apiFetch from '@wordpress/api-fetch';
import {
	createRoot,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import {
	Icon,
	bell,
	check,
	chevronDown,
	commentReplyLink,
	cog as settingsIcon,
	envelope,
	external,
	fullscreen,
	link,
	listView as tasksIcon,
	media as mediaIcon,
	menu,
	moreHorizontal,
	pages,
	pencil,
	people,
	postList,
	search,
	starEmpty,
	starFilled,
	trash,
} from '@wordpress/icons';
import CommentsThread from './comments/CommentsThread';
import usePostCollaboration from './collaboration/usePostCollaboration';
import './blocks';
import StateMessage from './components/StateMessage';
import PostEditorIframe from './editor/PostEditorIframe';
import P2BlockEditor from './editor/P2BlockEditor';
import { buildFeedPath } from './feed/query';
import MediaScreen from './media/MediaScreen';
import NotificationsScreen from './notifications/NotificationsScreen';
import TasksScreen from './tasks/TasksScreen';
import PagesScreen from './pages/PagesScreen';
import PeopleScreen from './people/PeopleScreen';
import SearchScreen from './search/SearchScreen';
import StartersScreen from './starters/StartersScreen';
import useSurveyRuntime from './surveys/useSurveyRuntime';
import './mentions/register';
import { routeFromHash, routeFromPath } from './routes';
import './style.scss';

const settings = window.q2Settings || {};
apiFetch.use( apiFetch.createNonceMiddleware( settings.restNonce ) );
apiFetch.use( apiFetch.createRootURLMiddleware( settings.restRoot ) );

const routes = [
	{ key: 'feed', label: __( 'Posts', 'q2' ), icon: postList, sidebar: true },
	{ key: 'pages', label: __( 'Pages', 'q2' ), icon: pages, sidebar: true },
	{
		key: 'media',
		label: __( 'Media', 'q2' ),
		icon: mediaIcon,
		sidebar: true,
	},
	{
		key: 'notifications',
		label: __( 'Notifications', 'q2' ),
		icon: bell,
		sidebar: true,
	},
	{ key: 'search', label: __( 'Search', 'q2' ), icon: search, sidebar: true },
	{
		key: 'tasks',
		label: __( 'Tasks', 'q2' ),
		icon: tasksIcon,
		sidebar: true,
	},
	{ key: 'people', label: __( 'People', 'q2' ), icon: people, sidebar: true },
	{ key: 'projects', label: __( 'Projects', 'q2' ), icon: postList },
	{ key: 'starters', label: __( 'Starter Buttons', 'q2' ), icon: starEmpty },
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
	const [ focusPostId, setFocusPostId ] = useState( 0 );
	const [ feedFilter, setFeedFilter ] = useState( 'all' );
	const [ feedMeta, setFeedMeta ] = useState( {
		newPostIds: [],
		newCommentPostIds: [],
		mentionPostIds: [],
	} );
	const [ editor, setEditor ] = useState( null );
	const [ contentRevision, setContentRevision ] = useState( 0 );
	const [ workspaceIconUrl, setWorkspaceIconUrl ] = useState(
		settings.workspace?.iconUrl || ''
	);

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

	useEffect( () => {
		apiFetch( { path: '/q2/v1/collaboration/feed' } )
			.then( setFeedMeta )
			.catch( () => {} );
	}, [ route ] );

	useEffect( () => {
		document.body.classList.toggle( 'q2-has-modal', Boolean( editor ) );
		return () => document.body.classList.remove( 'q2-has-modal' );
	}, [ editor ] );

	const openEditor = useCallback( ( postType, postId = 0 ) => {
		setEditor( { postType, postId, key: Date.now() } );
	}, [] );

	const chooseFeedFilter = useCallback(
		( nextFilter ) => {
			setFeedFilter( nextFilter );
			setFocusPostId( 0 );
			goToRoute( 'feed' );
		},
		[ goToRoute ]
	);

	const editorTitle = () => {
		if ( ! editor ) {
			return '';
		}
		if ( editor.postType === 'page' ) {
			return editor.postId
				? __( 'Edit page', 'q2' )
				: __( 'New page', 'q2' );
		}
		return editor.postId ? __( 'Edit post', 'q2' ) : __( 'New post', 'q2' );
	};

	const known = routes.some( ( item ) => item.key === route );
	let content = <ComingSoon route={ route } />;
	if ( ! known ) {
		content = <NotFound />;
	} else if ( route === 'feed' ) {
		content = (
			<Feed
				key={ contentRevision }
				focusPostId={ focusPostId }
				filter={ feedFilter }
				feedMeta={ feedMeta }
				onFilterChange={ chooseFeedFilter }
				onOpenInFullEditor={ ( postId ) =>
					openEditor( 'post', postId )
				}
			/>
		);
	} else if ( route === 'people' ) {
		content = <PeopleScreen />;
	} else if ( route === 'pages' ) {
		content = (
			<PagesScreen
				key={ contentRevision }
				onCreatePage={ () => openEditor( 'page' ) }
			/>
		);
	} else if ( route === 'media' ) {
		content = <MediaScreen />;
	} else if ( route === 'search' ) {
		content = <SearchScreen />;
	} else if ( route === 'tasks' ) {
		content = <TasksScreen />;
	} else if ( route === 'starters' ) {
		content = <StartersScreen />;
	} else if ( route === 'notifications' ) {
		content = (
			<NotificationsScreen
				onOpenPost={ ( postId ) => {
					setFocusPostId( postId );
					goToRoute( 'feed' );
				} }
			/>
		);
	}

	return (
		<div
			className={ `q2-app${ menuOpen ? ' is-menu-open' : '' }${
				editor ? ' is-full-editor' : ''
			}` }
		>
			<Topbar
				route={ route }
				workspaceIconUrl={ workspaceIconUrl }
				onNavigate={ goToRoute }
				onToggleMenu={ () => setMenuOpen( ( value ) => ! value ) }
				onNewPost={ () => openEditor( 'post' ) }
				onNewPage={ () => openEditor( 'page' ) }
			/>
			<aside
				className="q2-sidebar"
				aria-label={ __( 'Workspace navigation', 'q2' ) }
			>
				<WorkspaceSummary
					iconUrl={ workspaceIconUrl }
					onIconChange={ setWorkspaceIconUrl }
				/>
				<ActivityFilters
					filter={ feedFilter }
					feedMeta={ feedMeta }
					onChange={ chooseFeedFilter }
				/>
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
				<WorkspaceLinks />
				<Team onNavigate={ goToRoute } />
				<div className="q2-sidebar-footer">
					{ __( 'Powered by', 'q2' ) }{ ' ' }
					<a
						className="q2-sidebar-footer-link"
						href="https://github.com/plakio/q2"
						target="_blank"
						rel="noopener noreferrer"
					>
						Q2
					</a>
				</div>
			</aside>
			<main id="q2-main" className="q2-main" tabIndex="-1">
				{ content }
			</main>
			{ editor && (
				<div
					className="q2-full-editor-overlay"
					role="dialog"
					aria-modal="true"
					aria-label={ editorTitle() }
				>
					<PostEditorIframe
						key={ editor.key }
						postType={ editor.postType }
						postId={ editor.postId || 0 }
						isNew={ ! editor.postId }
						variant="full"
						title={ editorTitle() }
						onClose={ () => setEditor( null ) }
						onSaved={ () => {
							setEditor( null );
							setContentRevision( ( value ) => value + 1 );
						} }
					/>
				</div>
			) }
		</div>
	);
}

function Q2Logo( { size = 24, className = '' } ) {
	return (
		<img
			src={ `${ settings.pluginUrl }assets/images/q2-logo.png` }
			alt=""
			width={ size }
			height={ size }
			className={ className }
		/>
	);
}

function SiteIcon( { className = '', iconUrl = '' } ) {
	if ( iconUrl ) {
		return <img className={ className } src={ iconUrl } alt="" />;
	}

	return <Q2Logo size={ 40 } className={ className } />;
}

function Topbar( {
	route,
	workspaceIconUrl,
	onNavigate,
	onToggleMenu,
	onNewPost,
	onNewPage,
} ) {
	const user = settings.currentUser || {};
	const [ unreadCount, setUnreadCount ] = useState( 0 );

	useEffect( () => {
		const loadUnread = () => {
			apiFetch( { path: '/q2/v1/notifications?unread=true' } )
				.then( ( result ) => setUnreadCount( result.length ) )
				.catch( () => {} );
		};
		loadUnread();
		window.addEventListener( 'q2:notifications-changed', loadUnread );
		return () =>
			window.removeEventListener(
				'q2:notifications-changed',
				loadUnread
			);
	}, [ route ] );

	return (
		<header className="q2-topbar">
			<a className="q2-product" href={ settings.homeUrl } aria-label="Q2">
				<strong>Q2</strong>
			</a>
			<WorkspaceSwitcher
				user={ user }
				unreadCount={ unreadCount }
				iconUrl={ workspaceIconUrl }
				onNavigate={ onNavigate }
				onNewPost={ onNewPost }
				onNewPage={ onNewPage }
			/>
			<form
				className="q2-global-search"
				onSubmit={ ( event ) => {
					event.preventDefault();
					onNavigate( 'search' );
				} }
			>
				<input
					type="search"
					aria-label={ __( 'Search workspace', 'q2' ) }
					placeholder={ `Search in ${ settings.siteName || 'Q2' }` }
				/>
				<Icon icon={ search } size={ 24 } />
			</form>
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

function WorkspaceSwitcher( {
	user,
	unreadCount,
	iconUrl,
	onNavigate,
	onNewPost,
	onNewPage,
} ) {
	const [ open, setOpen ] = useState( false );
	const wrapperRef = useRef( null );
	const buttonRef = useRef( null );
	const menuId = 'q2-workspace-menu';

	useEffect( () => {
		if ( ! open ) {
			return undefined;
		}

		const handleClick = ( event ) => {
			if (
				wrapperRef.current &&
				! wrapperRef.current.contains( event.target )
			) {
				setOpen( false );
			}
		};
		const handleKey = ( event ) => {
			if ( event.key === 'Escape' ) {
				setOpen( false );
				buttonRef.current?.focus();
			}
		};

		document.addEventListener( 'mousedown', handleClick );
		document.addEventListener( 'keydown', handleKey );
		return () => {
			document.removeEventListener( 'mousedown', handleClick );
			document.removeEventListener( 'keydown', handleKey );
		};
	}, [ open ] );

	const canManage = !! settings.capabilities?.manageQ2;
	const description =
		settings.siteDescription || __( 'A collaborative workspace.', 'q2' );

	const closeMenu = () => setOpen( false );

	return (
		<div
			ref={ wrapperRef }
			className={ `q2-workspace-switcher${ open ? ' is-open' : '' }` }
		>
			<button
				ref={ buttonRef }
				type="button"
				className="q2-workspace-switcher-button"
				aria-haspopup="menu"
				aria-expanded={ open }
				aria-controls={ menuId }
				onClick={ () => setOpen( ( value ) => ! value ) }
			>
				<SiteIcon className="q2-topbar-site-icon" iconUrl={ iconUrl } />
				<strong>{ settings.siteName || 'Q2' }</strong>
				<Icon
					icon={ chevronDown }
					size={ 18 }
					className="q2-workspace-switcher-chevron"
				/>
			</button>
			{ open && (
				<div
					className="q2-workspace-menu"
					id={ menuId }
					role="menu"
					aria-label={ __( 'Workspace actions', 'q2' ) }
				>
					<div className="q2-workspace-menu-header">
						<SiteIcon
							className="q2-workspace-menu-icon"
							iconUrl={ iconUrl }
						/>
						<div className="q2-workspace-menu-meta">
							<strong>{ settings.siteName || 'Q2' }</strong>
							<span>{ description }</span>
						</div>
					</div>
					<div className="q2-workspace-menu-list" role="none">
						<button
							role="menuitem"
							type="button"
							className="q2-workspace-menu-item"
							onClick={ () => {
								closeMenu();
								onNewPost();
							} }
						>
							<Icon icon={ pencil } size={ 18 } />
							<span>{ __( 'New post', 'q2' ) }</span>
						</button>
						{ settings.capabilities?.createPages && (
							<button
								role="menuitem"
								type="button"
								className="q2-workspace-menu-item"
								onClick={ () => {
									closeMenu();
									onNewPage();
								} }
							>
								<Icon icon={ pages } size={ 18 } />
								<span>{ __( 'New page', 'q2' ) }</span>
							</button>
						) }
						<button
							role="menuitem"
							type="button"
							className="q2-workspace-menu-item"
							onClick={ () => {
								closeMenu();
								onNavigate( 'notifications' );
							} }
						>
							<Icon icon={ bell } size={ 18 } />
							<span>{ __( 'Notifications', 'q2' ) }</span>
							{ unreadCount > 0 && (
								<span className="q2-workspace-menu-badge">
									{ unreadCount > 99 ? '99+' : unreadCount }
								</span>
							) }
						</button>
						{ settings.profileUrl && (
							<a
								role="menuitem"
								href={ settings.profileUrl }
								className="q2-workspace-menu-item"
								onClick={ closeMenu }
							>
								<Icon icon={ external } size={ 18 } />
								<span>{ __( 'My profile', 'q2' ) }</span>
							</a>
						) }
						{ canManage && settings.adminUrl && (
							<a
								role="menuitem"
								href={ settings.adminUrl }
								className="q2-workspace-menu-item"
								onClick={ closeMenu }
							>
								<Icon icon={ settingsIcon } size={ 18 } />
								<span>
									{ __( 'Workspace settings', 'q2' ) }
								</span>
							</a>
						) }
						{ user.name && (
							<div
								className="q2-workspace-menu-user"
								role="presentation"
							>
								<img
									src={ user.avatarUrl }
									alt=""
									className="q2-workspace-menu-avatar"
								/>
								<div>
									<strong>{ user.name }</strong>
									<span>{ __( 'Signed in', 'q2' ) }</span>
								</div>
							</div>
						) }
						{ settings.logoutUrl && (
							<a
								role="menuitem"
								href={ settings.logoutUrl }
								className="q2-workspace-menu-item q2-workspace-menu-signout"
								onClick={ closeMenu }
							>
								<Icon icon={ external } size={ 18 } />
								<span>{ __( 'Sign out', 'q2' ) }</span>
							</a>
						) }
					</div>
				</div>
			) }
		</div>
	);
}

function WorkspaceSummary( { iconUrl, onIconChange } ) {
	const initial = settings.workspace || {};
	const [ coverUrl, setCoverUrl ] = useState( initial.coverUrl || '' );
	const [ saving, setSaving ] = useState( '' );
	const [ error, setError ] = useState( '' );
	const canEdit = !! initial.canEdit;

	const persist = async ( field, attachmentId ) => {
		const previousIconUrl = iconUrl;
		setSaving( field );
		setError( '' );
		try {
			const payload =
				field === 'cover'
					? { coverId: attachmentId }
					: { iconId: attachmentId };
			const result = await apiFetch( {
				path: '/q2/v1/workspace',
				method: 'PATCH',
				data: payload,
			} );
			setCoverUrl( result.coverUrl || '' );
			if ( field === 'icon' ) {
				onIconChange( result.iconUrl || '' );
			}
		} catch ( reason ) {
			if ( field === 'icon' ) {
				onIconChange( previousIconUrl );
			}
			setError(
				reason.message ||
					__( 'The workspace image could not be saved.', 'q2' )
			);
		} finally {
			setSaving( '' );
		}
	};

	const openMedia = ( field ) => {
		if ( ! canEdit ) {
			return;
		}
		if ( ! window.wp || ! window.wp.media ) {
			setError(
				__(
					'The media library is still loading. Please try again in a moment.',
					'q2'
				)
			);
			return;
		}
		const frame = window.wp.media( {
			title:
				field === 'cover'
					? __( 'Select cover image', 'q2' )
					: __( 'Select workspace icon', 'q2' ),
			button: {
				text:
					field === 'cover'
						? __( 'Use as cover', 'q2' )
						: __( 'Use as icon', 'q2' ),
			},
			library: { type: 'image' },
			multiple: false,
		} );
		frame.on( 'select', () => {
			const attachment = frame
				.state()
				.get( 'selection' )
				.first()
				.toJSON();
			if ( field === 'cover' ) {
				setCoverUrl(
					attachment.sizes?.large?.url ||
						attachment.sizes?.medium?.url ||
						attachment.url ||
						''
				);
			} else {
				onIconChange(
					attachment.sizes?.medium?.url ||
						attachment.sizes?.thumbnail?.url ||
						attachment.url ||
						''
				);
			}
			persist( field, attachment.id );
		} );
		frame.open();
	};

	const clearImage = ( field ) => {
		if ( field === 'cover' ) {
			setCoverUrl( '' );
			persist( 'cover', null );
		} else {
			onIconChange( '' );
			persist( 'icon', null );
		}
	};

	return (
		<div className="q2-workspace-summary">
			<div
				className={ `q2-workspace-cover${
					canEdit ? ' is-editable' : ''
				}${ coverUrl ? ' has-image' : '' }` }
				style={
					coverUrl
						? { backgroundImage: `url(${ coverUrl })` }
						: undefined
				}
			>
				{ canEdit && (
					<div className="q2-workspace-cover-actions">
						<button
							type="button"
							className="q2-workspace-cover-edit"
							onClick={ () => openMedia( 'cover' ) }
							disabled={ saving === 'cover' }
							aria-label={
								coverUrl
									? __( 'Change cover', 'q2' )
									: __( 'Add cover', 'q2' )
							}
						>
							<Icon icon={ pencil } size={ 14 } />
						</button>
						{ coverUrl && (
							<button
								type="button"
								className="q2-workspace-cover-remove"
								onClick={ () => clearImage( 'cover' ) }
								disabled={ saving === 'cover' }
								aria-label={ __( 'Remove cover', 'q2' ) }
							>
								<Icon icon={ trash } size={ 18 } />
							</button>
						) }
					</div>
				) }
			</div>
			<div className="q2-workspace-details">
				<div
					className={ `q2-workspace-icon-wrapper${
						iconUrl ? ' has-image' : ''
					}` }
				>
					{ iconUrl ? (
						<img
							className="q2-workspace-icon"
							src={ iconUrl }
							alt=""
						/>
					) : (
						<Q2Logo
							size={ 64 }
							className="q2-workspace-icon q2-workspace-icon-default"
						/>
					) }
					{ canEdit && (
						<div className="q2-workspace-icon-actions">
							<button
								type="button"
								className="q2-workspace-icon-edit"
								onClick={ () => openMedia( 'icon' ) }
								disabled={ saving === 'icon' }
								aria-label={
									iconUrl
										? __( 'Change workspace icon', 'q2' )
										: __( 'Add workspace icon', 'q2' )
								}
							>
								<Icon icon={ pencil } size={ 12 } />
							</button>
							{ iconUrl && (
								<button
									type="button"
									className="q2-workspace-icon-remove"
									onClick={ () => clearImage( 'icon' ) }
									disabled={ saving === 'icon' }
									aria-label={ __(
										'Remove workspace icon',
										'q2'
									) }
								>
									<Icon icon={ trash } size={ 14 } />
								</button>
							) }
						</div>
					) }
				</div>
				<h1>{ settings.siteName || 'Q2' }</h1>
				<p>
					{ settings.siteDescription ||
						__( 'A collaborative workspace.', 'q2' ) }
				</p>
				{ error && (
					<p className="q2-workspace-error" role="alert">
						{ error }
					</p>
				) }
			</div>
		</div>
	);
}

function ActivityFilters( { filter, feedMeta, onChange } ) {
	const items = [
		{
			key: 'new-posts',
			label: __( 'New posts', 'q2' ),
			count: feedMeta.newPostIds.length,
		},
		{
			key: 'new-comments',
			label: __( 'New comments', 'q2' ),
			count: feedMeta.newCommentPostIds.length,
		},
		{
			key: 'mentions',
			label: __( 'My mentions', 'q2' ),
			count: feedMeta.mentionPostIds.length,
		},
		{
			key: 'my-posts',
			label: __( 'My posts', 'q2' ),
			icon: people,
		},
	];

	return (
		<nav
			className="q2-activity-filters"
			aria-label={ __( 'Post filters', 'q2' ) }
		>
			{ items.map( ( item ) => (
				<button
					key={ item.key }
					type="button"
					className={ filter === item.key ? 'is-active' : '' }
					aria-pressed={ filter === item.key }
					onClick={ () => onChange( item.key ) }
				>
					<span
						className={ `q2-activity-filter-icon${
							item.count ? ' has-unread' : ''
						}` }
					>
						<ActivityFilterIcon item={ item } />
					</span>
					<span>{ item.label }</span>
				</button>
			) ) }
		</nav>
	);
}

function ActivityFilterIcon( { item } ) {
	if ( item.icon ) {
		return <Icon icon={ item.icon } size={ 18 } />;
	}
	if ( item.count ) {
		return item.count > 99 ? '99+' : item.count;
	}
	return <Icon icon={ check } size={ 16 } />;
}

function WorkspaceLinks() {
	const links = settings.links || [];
	const editUrl = settings.linksEditUrl;

	return (
		<section className="q2-workspace-links">
			<header>
				<h2>{ __( 'Links', 'q2' ) }</h2>
				{ editUrl && (
					<a href={ editUrl } aria-label={ __( 'Edit links', 'q2' ) }>
						<span aria-hidden="true">•••</span>
					</a>
				) }
			</header>
			{ links.length > 0 ? (
				<ul>
					{ links.map( ( item ) => (
						<li
							key={ item.id || item.url }
							style={ {
								'--q2-link-depth': item.depth || 0,
							} }
						>
							<a
								href={ item.url }
								target={ item.newTab ? '_blank' : undefined }
								rel={
									item.newTab
										? 'noopener noreferrer'
										: undefined
								}
							>
								<Icon icon={ link } size={ 16 } />
								<span>{ item.label }</span>
							</a>
						</li>
					) ) }
				</ul>
			) : (
				<p>{ __( 'No links yet.', 'q2' ) }</p>
			) }
		</section>
	);
}

function Team( { onNavigate } ) {
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
				<button
					type="button"
					className="q2-team-more"
					onClick={ () => onNavigate && onNavigate( 'people' ) }
					aria-label={ __( 'View all team members', 'q2' ) }
				>
					<span aria-hidden="true">•••</span>
				</button>
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

function Feed( {
	focusPostId = 0,
	filter,
	feedMeta,
	onFilterChange,
	onOpenInFullEditor,
} ) {
	const [ posts, setPosts ] = useState( [] );
	const [ status, setStatus ] = useState( 'loading' );
	const [ error, setError ] = useState( '' );
	const [ refresh, setRefresh ] = useState( 0 );
	const [ page, setPage ] = useState( 1 );
	const [ hasMore, setHasMore ] = useState( true );
	const [ view, setView ] = useState( 'default' );
	const perPage = 10;

	useEffect( () => {
		apiFetch( { path: '/q2/v1/preferences/feed-view' } )
			.then( ( result ) => setView( result.view ) )
			.catch( () => {} );
	}, [ refresh ] );

	useEffect( () => {
		let active = true;
		setStatus( page === 1 ? 'loading' : 'loading-more' );
		const path = buildFeedPath( {
			page,
			perPage,
			canEdit: settings.capabilities?.createPosts,
			userId: settings.currentUser.id,
			filter,
			feedMeta,
			focusPostId,
		} );
		if ( ! path ) {
			setPosts( [] );
			setHasMore( false );
			setStatus( 'ready' );
			return () => {
				active = false;
			};
		}
		apiFetch( { path } )
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
	}, [ feedMeta, filter, focusPostId, page, refresh ] );

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

	const removePost = useCallback( ( id ) => {
		setPosts( ( current ) => current.filter( ( item ) => item.id !== id ) );
	}, [] );

	const chooseFilter = ( nextFilter ) => {
		setPosts( [] );
		setPage( 1 );
		onFilterChange( nextFilter );
	};

	const chooseView = async ( nextView ) => {
		setView( nextView );
		await apiFetch( {
			path: '/q2/v1/preferences/feed-view',
			method: 'POST',
			data: { view: nextView },
		} );
	};

	return (
		<div className={ `q2-feed is-${ view }-view` }>
			{ settings.capabilities?.createPosts && (
				<Composer
					onCreated={ reload }
					onOpenFullEditor={ onOpenInFullEditor }
				/>
			) }
			<div className="q2-feed-tools">
				<label htmlFor="q2-feed-filter">
					<span className="screen-reader-text">
						{ __( 'Filter feed', 'q2' ) }
					</span>
					<select
						id="q2-feed-filter"
						value={ filter }
						onChange={ ( event ) =>
							chooseFilter( event.target.value )
						}
					>
						<option value="all">{ __( 'All posts', 'q2' ) }</option>
						<option value="new-posts">
							{ __( 'New Posts', 'q2' ) }
						</option>
						<option value="new-comments">
							{ __( 'New Comments', 'q2' ) }
						</option>
						<option value="my-posts">
							{ __( 'My Posts', 'q2' ) }
						</option>
						<option value="mentions">
							{ __( 'My Mentions', 'q2' ) }
						</option>
					</select>
				</label>
				<label htmlFor="q2-feed-view">
					<span className="screen-reader-text">
						{ __( 'Feed view', 'q2' ) }
					</span>
					<select
						id="q2-feed-view"
						value={ view }
						onChange={ ( event ) =>
							chooseView( event.target.value )
						}
					>
						<option value="default">
							{ __( 'Default view', 'q2' ) }
						</option>
						<option value="expanded">
							{ __( 'Expanded view', 'q2' ) }
						</option>
						<option value="compact">
							{ __( 'Compact view', 'q2' ) }
						</option>
					</select>
				</label>
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
				{ ( status === 'ready' || status === 'loading-more' ) &&
					posts.map( ( post ) => (
						<Post
							key={ post.id }
							post={ post }
							onUpdated={ updatePost }
							onRemoved={ removePost }
							onOpenInFullEditor={ onOpenInFullEditor }
							isUnread={
								feedMeta.newPostIds.includes( post.id ) ||
								feedMeta.newCommentPostIds.includes( post.id )
							}
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

function Composer( { onCreated, onOpenFullEditor } ) {
	const [ expanded, setExpanded ] = useState( false );
	const [ editorKey, setEditorKey ] = useState( 0 );
	const [ message, setMessage ] = useState( '' );
	const avatar = settings.currentUser?.avatarUrl;
	const canPublish = Boolean( settings.capabilities?.publishPosts );

	const handleSaved = () => {
		setMessage(
			canPublish
				? __( 'Update published.', 'q2' )
				: __( 'Update submitted for review.', 'q2' )
		);
		setEditorKey( ( value ) => value + 1 );
		onCreated();
	};

	const closeComposer = () => {
		setExpanded( false );
		setEditorKey( ( value ) => value + 1 );
	};

	if ( ! expanded ) {
		return (
			<section
				className="q2-composer"
				aria-label={ __( 'Create a post', 'q2' ) }
			>
				<div className="q2-composer-inner">
					<img src={ avatar } alt="" />
					<div className="q2-composer-field">
						<span className="q2-composer-now">
							{ __( 'Now', 'q2' ) }
						</span>
						<button
							type="button"
							className="q2-composer-prompt"
							onClick={ () => setExpanded( true ) }
						>
							{ sprintf(
								/* translators: %s: current user's display name. */
								__(
									'Hi, %s! Post an update, ask a question, or share ideas.',
									'q2'
								),
								settings.currentUser?.name ||
									__( 'there', 'q2' )
							) }
						</button>
					</div>
					<button
						type="button"
						className="q2-composer-submit"
						disabled
					>
						{ __( 'Post', 'q2' ) }
					</button>
				</div>
				<p className="q2-composer-message" aria-live="polite">
					{ message }
				</p>
			</section>
		);
	}

	return (
		<section
			className="q2-composer is-expanded"
			aria-label={ __( 'Create a post', 'q2' ) }
		>
			<P2BlockEditor
				key={ editorKey }
				onSaved={ handleSaved }
				onClose={ closeComposer }
				onOpenFullEditor={ onOpenFullEditor }
				submitLabel={
					canPublish
						? __( 'Publish', 'q2' )
						: __( 'Submit for review', 'q2' )
				}
			/>
			<p className="q2-composer-message" aria-live="polite">
				{ message }
			</p>
		</section>
	);
}

function Post( {
	post,
	onUpdated,
	onRemoved,
	onOpenInFullEditor,
	isUnread = false,
} ) {
	const author = post._embedded?.author?.[ 0 ];
	const articleRef = useRef( null );
	const contentRef = useRef( null );
	const {
		state: collaborationState,
		ready: collaborationReady,
		update: updateCollaboration,
	} = usePostCollaboration( post.id );
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
	useSurveyRuntime( post.id, contentRef, ! editing );
	const date = useMemo(
		() =>
			new Intl.DateTimeFormat( undefined, {
				dateStyle: 'medium',
				timeStyle: 'short',
			} ).format( new Date( post.date_gmt + 'Z' ) ),
		[ post.date_gmt ]
	);

	useEffect( () => {
		if (
			! collaborationReady ||
			! isUnread ||
			collaborationState.read ||
			! articleRef.current
		) {
			return undefined;
		}
		const observer = new window.IntersectionObserver(
			( entries ) => {
				if ( entries.some( ( entry ) => entry.isIntersecting ) ) {
					updateCollaboration( 'read' );
					observer.disconnect();
				}
			},
			{ threshold: 0.6 }
		);
		observer.observe( articleRef.current );
		return () => observer.disconnect();
	}, [
		collaborationReady,
		collaborationState.read,
		isUnread,
		updateCollaboration,
	] );

	const deletePost = async () => {
		setMenuOpen( false );
		// eslint-disable-next-line no-alert
		const confirmed = window.confirm(
			__( 'Delete this post? This moves it to the trash.', 'q2' )
		);
		if ( ! confirmed ) {
			return;
		}
		setDeleting( true );
		try {
			await apiFetch( {
				path: `/wp/v2/posts/${ post.id }`,
				method: 'DELETE',
				data: { force: false },
			} );
			if ( onRemoved ) {
				onRemoved( post.id );
			}
		} catch ( reason ) {
			setDeleting( false );
			// eslint-disable-next-line no-alert
			window.alert(
				reason.message || __( 'The post could not be deleted.', 'q2' )
			);
		}
	};

	const [ menuOpen, setMenuOpen ] = useState( false );
	const [ deleting, setDeleting ] = useState( false );
	const menuRef = useRef( null );
	const menuButtonRef = useRef( null );

	useEffect( () => {
		if ( ! menuOpen ) {
			return undefined;
		}
		const handleClick = ( event ) => {
			if (
				menuRef.current &&
				! menuRef.current.contains( event.target )
			) {
				setMenuOpen( false );
			}
		};
		const handleKey = ( event ) => {
			if ( event.key === 'Escape' ) {
				setMenuOpen( false );
				menuButtonRef.current?.focus();
			}
		};
		document.addEventListener( 'mousedown', handleClick );
		document.addEventListener( 'keydown', handleKey );
		return () => {
			document.removeEventListener( 'mousedown', handleClick );
			document.removeEventListener( 'keydown', handleKey );
		};
	}, [ menuOpen ] );

	useEffect( () => {
		if ( ! editing ) {
			return undefined;
		}
		document.body.classList.add( 'q2-has-modal' );
		const closeOnEscape = ( event ) => {
			if ( 'Escape' === event.key ) {
				setEditing( false );
			}
		};
		document.addEventListener( 'keydown', closeOnEscape );
		return () => {
			document.body.classList.remove( 'q2-has-modal' );
			document.removeEventListener( 'keydown', closeOnEscape );
		};
	}, [ editing ] );

	return (
		<article
			ref={ articleRef }
			className={ `q2-post${
				isUnread && ! collaborationState.read ? ' is-unread' : ''
			}` }
		>
			{ canEdit && ! editing && (
				<div
					ref={ menuRef }
					className={ `q2-post-menu-wrapper${
						menuOpen ? ' is-open' : ''
					}` }
				>
					<button
						ref={ menuButtonRef }
						className="q2-post-menu"
						type="button"
						aria-haspopup="menu"
						aria-expanded={ menuOpen }
						aria-label={ __( 'Post actions', 'q2' ) }
						disabled={ deleting }
						onClick={ () => setMenuOpen( ( value ) => ! value ) }
					>
						<Icon icon={ moreHorizontal } size={ 24 } />
					</button>
					{ menuOpen && (
						<div className="q2-post-menu-dropdown" role="menu">
							<button
								role="menuitem"
								type="button"
								onClick={ () => {
									setMenuOpen( false );
									setEditing( true );
								} }
							>
								<Icon icon={ fullscreen } size={ 19 } />
								<span>{ __( 'Edit post', 'q2' ) }</span>
							</button>
							<button
								role="menuitem"
								type="button"
								className="q2-post-menu-danger"
								onClick={ deletePost }
							>
								<Icon icon={ trash } size={ 19 } />
								<span>{ __( 'Delete post', 'q2' ) }</span>
							</button>
						</div>
					) }
				</div>
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
			{ editing && (
				<div
					className="q2-post-editor-overlay is-p2"
					role="dialog"
					aria-modal="true"
					aria-label={ __( 'Edit post', 'q2' ) }
				>
					<P2BlockEditor
						postId={ post.id }
						onClose={ () => setEditing( false ) }
						onOpenFullEditor={ onOpenInFullEditor }
						onSaved={ async ( updated ) => {
							try {
								const refreshed = await apiFetch( {
									path: `/wp/v2/posts/${ updated.id }?context=edit&_embed=author,wp:term,replies`,
								} );
								onUpdated( refreshed );
							} catch {
								onUpdated( updated );
							}
							setEditing( false );
						} }
					/>
				</div>
			) }
			{ tagTerms.length > 0 && ! editing && (
				<ul className="q2-post-tags" aria-label={ __( 'Tags', 'q2' ) }>
					{ tagTerms.map( ( term ) => (
						<li key={ term.id }>+{ term.name }</li>
					) ) }
				</ul>
			) }
			{ ! editing && (
				<div
					ref={ contentRef }
					className="q2-post-content"
					dangerouslySetInnerHTML={ {
						__html: post.content.rendered,
					} }
				/>
			) }
			<footer>
				<button
					type="button"
					onClick={ () => setCommentsOpen( ( value ) => ! value ) }
					aria-expanded={ commentsOpen }
				>
					<Icon icon={ commentReplyLink } size={ 18 } />
					{ __( 'Reply', 'q2' ) }
					{ replyCount > 0 && ` (${ replyCount })` }
				</button>
				<button
					type="button"
					disabled={ ! collaborationReady }
					aria-pressed={ collaborationState.following }
					onClick={ () =>
						updateCollaboration(
							'follow',
							! collaborationState.following
						)
					}
				>
					<Icon icon={ envelope } size={ 18 } />
					{ collaborationState.following
						? __( 'Following', 'q2' )
						: __( 'Follow', 'q2' ) }
				</button>
				<button
					type="button"
					disabled={ ! collaborationReady }
					aria-pressed={ collaborationState.liked }
					onClick={ () =>
						updateCollaboration(
							'like',
							! collaborationState.liked
						)
					}
				>
					<Icon
						icon={
							collaborationState.liked ? starFilled : starEmpty
						}
						size={ 18 }
					/>
					{ collaborationState.liked
						? __( 'Liked', 'q2' )
						: __( 'Like', 'q2' ) }
					{ collaborationState.likes > 0 &&
						` (${ collaborationState.likes })` }
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
const root = document.getElementById( 'q2-root' );
if ( root ) {
	createRoot( root ).render( <App /> );
}
