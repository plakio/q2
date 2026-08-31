import apiFetch from '@wordpress/api-fetch';
import { useCallback, useEffect, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

const typeLabels = {
	comment: __( 'commented on a thread you follow', 'q2' ),
	mention: __( 'mentioned you', 'q2' ),
	like: __( 'liked your update', 'q2' ),
};

export default function NotificationsScreen( { onOpenPost } ) {
	const [ notifications, setNotifications ] = useState( [] );
	const [ unreadOnly, setUnreadOnly ] = useState( false );
	const [ status, setStatus ] = useState( 'loading' );

	const load = useCallback( () => {
		setStatus( 'loading' );
		apiFetch( {
			path: `/q2/v1/notifications${ unreadOnly ? '?unread=true' : '' }`,
		} )
			.then( ( result ) => {
				setNotifications( result );
				setStatus( 'ready' );
			} )
			.catch( () => setStatus( 'error' ) );
	}, [ unreadOnly ] );

	useEffect( load, [ load ] );

	const markRead = async ( id = 0 ) => {
		await apiFetch( {
			path: '/q2/v1/notifications/read',
			method: 'POST',
			data: id ? { id } : {},
		} );
		window.dispatchEvent( new CustomEvent( 'q2:notifications-changed' ) );
		load();
	};

	return (
		<div className="q2-column q2-notifications-screen">
			<header className="q2-page-header">
				<div>
					<span className="q2-eyebrow">{ __( 'Inbox', 'q2' ) }</span>
					<h1>{ __( 'Notifications', 'q2' ) }</h1>
				</div>
				<button type="button" onClick={ () => markRead() }>
					{ __( 'Mark all read', 'q2' ) }
				</button>
			</header>
			<div className="q2-notification-filters">
				<button
					type="button"
					className={ unreadOnly ? '' : 'is-active' }
					onClick={ () => setUnreadOnly( false ) }
				>
					{ __( 'All', 'q2' ) }
				</button>
				<button
					type="button"
					className={ unreadOnly ? 'is-active' : '' }
					onClick={ () => setUnreadOnly( true ) }
				>
					{ __( 'Unread', 'q2' ) }
				</button>
			</div>
			{ status === 'loading' && (
				<p>{ __( 'Loading notifications…', 'q2' ) }</p>
			) }
			{ status === 'error' && (
				<p role="alert">
					{ __( 'Notifications could not be loaded.', 'q2' ) }
				</p>
			) }
			{ status === 'ready' && notifications.length === 0 && (
				<p>{ __( 'You are all caught up.', 'q2' ) }</p>
			) }
			{ status === 'ready' && (
				<ul className="q2-notification-list">
					{ notifications.map( ( item ) => (
						<li
							key={ item.id }
							className={ item.read ? '' : 'is-unread' }
						>
							<button
								type="button"
								onClick={ async () => {
									await markRead( item.id );
									onOpenPost( item.objectId );
								} }
							>
								<img src={ item.avatarUrl } alt="" />
								<span>
									<strong>{ item.actorName }</strong>{ ' ' }
									{ typeLabels[ item.type ] ||
										__( 'sent an update', 'q2' ) }
									<time dateTime={ item.createdAt }>
										{ ' — ' }
										{ new Intl.DateTimeFormat( undefined, {
											dateStyle: 'medium',
										} ).format(
											new Date( item.createdAt )
										) }
									</time>
								</span>
							</button>
						</li>
					) ) }
				</ul>
			) }
		</div>
	);
}
