import apiFetch from '@wordpress/api-fetch';
import { createBlock, serialize } from '@wordpress/blocks';
import {
	createRoot,
	useCallback,
	useEffect,
	useMemo,
	useState,
} from '@wordpress/element';
import { __, _n, sprintf } from '@wordpress/i18n';
import { routeFromHash, routeFromPath } from './routes';
import './style.scss';

const settings = window.q2Settings || {};
apiFetch.use( apiFetch.createNonceMiddleware( settings.restNonce ) );
apiFetch.use( apiFetch.createRootURLMiddleware( settings.restRoot ) );

const routes = [
	[ 'feed', __( 'Feed', 'q2' ) ],
	[ 'notifications', __( 'Notifications', 'q2' ) ],
	[ 'search', __( 'Search', 'q2' ) ],
	[ 'pages', __( 'Pages', 'q2' ) ],
	[ 'projects', __( 'Projects', 'q2' ) ],
	[ 'people', __( 'People', 'q2' ) ],
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

	useEffect( () => {
		const onPopState = () => setRoute( routeFromLocation() );
		window.addEventListener( 'popstate', onPopState );
		return () => window.removeEventListener( 'popstate', onPopState );
	}, [] );

	const navigate = useCallback( ( event, nextRoute ) => {
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
		const nextUrl =
			nextRoute === 'feed'
				? settings.homeUrl
				: `${ settings.homeUrl }#${ nextRoute }`;
		window.history.pushState( {}, '', nextUrl );
		setRoute( nextRoute );
		document.querySelector( '#q2-main' )?.focus();
	}, [] );

	const known = routes.some( ( [ key ] ) => key === route );
	let content = <ComingSoon route={ route } />;
	if ( ! known ) {
		content = <NotFound />;
	} else if ( route === 'feed' ) {
		content = <Feed />;
	}

	return (
		<div className="q2-app">
			<aside
				className="q2-sidebar"
				aria-label={ __( 'Workspace navigation', 'q2' ) }
			>
				<a
					className="q2-brand"
					href={ settings.homeUrl }
					onClick={ ( event ) => navigate( event, 'feed' ) }
				>
					<span className="q2-brand-mark" aria-hidden="true">
						Q
					</span>
					<span>
						<strong>Q2</strong>
						<small>{ settings.siteName }</small>
					</span>
				</a>
				<nav>
					{ routes.map( ( [ key, label ] ) => (
						<a
							key={ key }
							className={ route === key ? 'is-active' : '' }
							aria-current={ route === key ? 'page' : undefined }
							href={
								key === 'feed'
									? settings.homeUrl
									: `${ settings.homeUrl }#${ key }`
							}
							onClick={ ( event ) => navigate( event, key ) }
						>
							{ label }
						</a>
					) ) }
				</nav>
				<UserCard />
			</aside>
			<main id="q2-main" className="q2-main" tabIndex="-1">
				{ content }
			</main>
		</div>
	);
}

function UserCard() {
	const user = settings.currentUser || {};
	return (
		<div className="q2-user">
			<img src={ user.avatarUrl } alt="" />
			<span>{ user.name }</span>
		</div>
	);
}

function Feed() {
	const [ posts, setPosts ] = useState( [] );
	const [ status, setStatus ] = useState( 'loading' );
	const [ error, setError ] = useState( '' );
	const [ refresh, setRefresh ] = useState( 0 );

	useEffect( () => {
		let active = true;
		setStatus( 'loading' );
		apiFetch( { path: '/wp/v2/posts?per_page=20&_embed=author,wp:term' } )
			.then( ( result ) => {
				if ( active ) {
					setPosts( result );
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
	}, [ refresh ] );

	return (
		<div className="q2-column">
			<header className="q2-page-header">
				<div>
					<span className="q2-eyebrow">
						{ __( 'Workspace', 'q2' ) }
					</span>
					<h1>{ __( 'Feed', 'q2' ) }</h1>
				</div>
			</header>
			{ settings.capabilities?.createPosts && (
				<Composer
					onCreated={ () => setRefresh( ( value ) => value + 1 ) }
				/>
			) }
			{ status === 'loading' && (
				<StateMessage>{ __( 'Loading updates…', 'q2' ) }</StateMessage>
			) }
			{ status === 'error' && (
				<StateMessage>
					<strong>{ __( 'Something went wrong', 'q2' ) }</strong>
					<span>{ error }</span>
					<button
						onClick={ () => setRefresh( ( value ) => value + 1 ) }
					>
						{ __( 'Try again', 'q2' ) }
					</button>
				</StateMessage>
			) }
			{ status === 'ready' && posts.length === 0 && (
				<StateMessage>
					<strong>{ __( 'Start the conversation', 'q2' ) }</strong>
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
					<Post key={ post.id } post={ post } />
				) ) }
		</div>
	);
}

function Composer( { onCreated } ) {
	const [ text, setText ] = useState( '' );
	const [ busy, setBusy ] = useState( false );
	const [ message, setMessage ] = useState( '' );
	const avatar = settings.currentUser?.avatarUrl;

	const publish = async ( event ) => {
		event.preventDefault();
		const paragraphs = text
			.split( /\n\s*\n/ )
			.map( ( value ) => value.trim() )
			.filter( Boolean );
		if ( paragraphs.length === 0 ) {
			setMessage( __( 'Write something before publishing.', 'q2' ) );
			return;
		}
		setBusy( true );
		setMessage( '' );
		try {
			await apiFetch( {
				path: '/wp/v2/posts',
				method: 'POST',
				data: {
					content: serialize(
						paragraphs.map( ( value ) =>
							createBlock( 'core/paragraph', {
								content: value.replace( /\n/g, '<br>' ),
							} )
						)
					),
					status: settings.capabilities?.publishPosts
						? 'publish'
						: 'pending',
				},
			} );
			setText( '' );
			setMessage(
				settings.capabilities?.publishPosts
					? __( 'Update published.', 'q2' )
					: __( 'Update submitted for review.', 'q2' )
			);
			onCreated();
		} catch ( reason ) {
			setMessage(
				reason.message ||
					__( 'The update could not be published.', 'q2' )
			);
		} finally {
			setBusy( false );
		}
	};

	return (
		<form className="q2-composer" onSubmit={ publish }>
			<img src={ avatar } alt="" />
			<div>
				<label
					className="screen-reader-text"
					htmlFor="q2-composer-text"
				>
					{ __( 'New update', 'q2' ) }
				</label>
				<textarea
					id="q2-composer-text"
					value={ text }
					onChange={ ( event ) => setText( event.target.value ) }
					rows="3"
					placeholder={ __(
						'Share an update, ask a question, or start a discussion…',
						'q2'
					) }
				/>
				<footer>
					<span aria-live="polite">{ message }</span>
					<button type="submit" disabled={ busy }>
						{ busy
							? __( 'Publishing…', 'q2' )
							: __( 'Publish', 'q2' ) }
					</button>
				</footer>
			</div>
		</form>
	);
}

function Post( { post } ) {
	const author = post._embedded?.author?.[ 0 ];
	const replyCount = post._embedded?.replies?.[ 0 ]?.length || 0;
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
	return (
		<article className="q2-post">
			<header>
				<img src={ author?.avatar_urls?.[ 48 ] } alt="" />
				<div>
					<strong>
						{ author?.name || __( 'Unknown author', 'q2' ) }
					</strong>
					<time dateTime={ post.date_gmt + 'Z' }>{ date }</time>
				</div>
			</header>
			{ post.title?.rendered && (
				<h2
					dangerouslySetInnerHTML={ { __html: post.title.rendered } }
				/>
			) }
			<div
				className="q2-post-content"
				dangerouslySetInnerHTML={ { __html: post.content.rendered } }
			/>
			<footer>
				<span>{ replyLabel }</span>
				<span>{ __( 'Follow', 'q2' ) }</span>
				<span>{ __( 'Like', 'q2' ) }</span>
			</footer>
		</article>
	);
}

function ComingSoon( { route } ) {
	const label = routes.find( ( [ key ] ) => key === route )?.[ 1 ] || route;
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
