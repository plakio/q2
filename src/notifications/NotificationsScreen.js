import apiFetch from '@wordpress/api-fetch';
import { useCallback, useEffect, useState } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import StateMessage from '../components/StateMessage';

const TYPE_LABELS = {
	comment: __( 'commented on a thread you follow', 'q2' ),
	mention: __( 'mentioned you', 'q2' ),
	like: __( 'liked your update', 'q2' ),
	task_assigned: __( 'assigned a task to you', 'q2' ),
};

function formatDate( value ) {
	if ( ! value ) {
		return '';
	}
	return new Intl.DateTimeFormat( undefined, {
		dateStyle: 'medium',
	} ).format( new Date( value ) );
}

function describeTask( payload ) {
	if ( ! payload ) {
		return null;
	}
	const taskTitle = payload.title || __( 'Untitled task', 'q2' );
	if ( payload.due_date ) {
		return sprintf(
			/* translators: 1: task title, 2: due date. */
			__( 'the task “%1$s” (due %2$s)', 'q2' ),
			taskTitle,
			payload.due_date
		);
	}
	return sprintf(
		/* translators: %s: task title. */
		__( 'the task “%s”', 'q2' ),
		taskTitle
	);
}

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
				<StateMessage>
					<strong>
						{ __( 'Notifications could not be loaded.', 'q2' ) }
					</strong>
				</StateMessage>
			) }
			{ status === 'ready' && notifications.length === 0 && (
				<p>{ __( 'You are all caught up.', 'q2' ) }</p>
			) }
			{ status === 'ready' && (
				<ul className="q2-notification-list">
					{ notifications.map( ( item ) => {
						const taskContext =
							'task_assigned' === item.type
								? describeTask( item.payload )
								: null;
						const summary =
							taskContext ||
							TYPE_LABELS[ item.type ] ||
							__( 'sent an update', 'q2' );
						return (
							<li
								key={ item.id }
								className={ item.read ? '' : 'is-unread' }
							>
								<button
									type="button"
									onClick={ async () => {
										await markRead( item.id );
										if ( item.objectId ) {
											onOpenPost( item.objectId );
										}
									} }
								>
									<img src={ item.avatarUrl } alt="" />
									<span>
										<strong>{ item.actorName }</strong>{ ' ' }
										{ summary }
										<time dateTime={ item.createdAt }>
											{ ' — ' }
											{ formatDate( item.createdAt ) }
										</time>
									</span>
								</button>
							</li>
						);
					} ) }
				</ul>
			) }
		</div>
	);
}
