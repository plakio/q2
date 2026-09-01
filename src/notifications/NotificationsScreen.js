import apiFetch from '@wordpress/api-fetch';
import { useCallback, useEffect, useMemo, useState } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import {
	Icon,
	atSymbol,
	bell,
	commentReplyLink,
	starFilled,
} from '@wordpress/icons';
import StateMessage from '../components/StateMessage';

const TYPE_LABELS = {
	comment: __( 'commented on a thread you follow', 'q2' ),
	mention: __( 'mentioned you', 'q2' ),
	like: __( 'liked your update', 'q2' ),
	task_assigned: __( 'assigned a task to you', 'q2' ),
	task_due_soon: __( 'reminded you about a task', 'q2' ),
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
	const [ filter, setFilter ] = useState( 'all' );
	const [ status, setStatus ] = useState( 'loading' );

	const load = useCallback( () => {
		setStatus( 'loading' );
		apiFetch( { path: '/q2/v1/notifications' } )
			.then( ( result ) => {
				setNotifications( result );
				setStatus( 'ready' );
			} )
			.catch( () => setStatus( 'error' ) );
	}, [] );

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

	const filtered = useMemo(
		() =>
			notifications.filter( ( item ) => {
				if ( 'unread' === filter ) {
					return ! item.read;
				}
				if ( 'comments' === filter ) {
					return (
						'comment' === item.type &&
						'reply' === item.payload?.source
					);
				}
				if ( 'follows' === filter ) {
					return (
						'comment' === item.type &&
						'reply' !== item.payload?.source
					);
				}
				if ( 'likes' === filter ) {
					return 'like' === item.type;
				}
				return true;
			} ),
		[ filter, notifications ]
	);

	const groups = useMemo( () => {
		const result = [];
		filtered.forEach( ( item ) => {
			const date = new Date( item.createdAt );
			const today = new Date();
			const startToday = new Date(
				today.getFullYear(),
				today.getMonth(),
				today.getDate()
			);
			const day = new Date(
				date.getFullYear(),
				date.getMonth(),
				date.getDate()
			);
			const daysAgo = Math.round( ( startToday - day ) / 86400000 );
			let label = __( 'Older than 2 days', 'q2' );
			if ( 0 === daysAgo ) {
				label = __( 'Today', 'q2' );
			} else if ( 1 === daysAgo ) {
				label = __( 'Yesterday', 'q2' );
			}
			let group = result.find( ( entry ) => entry.label === label );
			if ( ! group ) {
				group = { label, items: [] };
				result.push( group );
			}
			group.items.push( item );
		} );
		return result;
	}, [ filtered ] );

	const filters = [
		[ 'all', __( 'All', 'q2' ) ],
		[ 'unread', __( 'Unread', 'q2' ) ],
		[ 'comments', __( 'Comments', 'q2' ) ],
		[ 'follows', __( 'Follows', 'q2' ) ],
		[ 'likes', __( 'Likes', 'q2' ) ],
	];
	const typeIcon = ( item ) => {
		if ( 'like' === item.type ) {
			return starFilled;
		}
		if ( 'mention' === item.type ) {
			return atSymbol;
		}
		if ( 'comment' === item.type ) {
			return commentReplyLink;
		}
		return bell;
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
				{ filters.map( ( [ key, label ] ) => (
					<button
						key={ key }
						type="button"
						className={ filter === key ? 'is-active' : '' }
						onClick={ () => setFilter( key ) }
					>
						{ label }
					</button>
				) ) }
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
			{ status === 'ready' && filtered.length === 0 && (
				<p>{ __( 'You are all caught up.', 'q2' ) }</p>
			) }
			{ status === 'ready' &&
				groups.map( ( group ) => (
					<section
						className="q2-notification-group"
						key={ group.label }
					>
						<h2>{ group.label }</h2>
						<ul className="q2-notification-list">
							{ group.items.map( ( item ) => {
								const taskContext =
									'task_assigned' === item.type ||
									'task_due_soon' === item.type
										? describeTask( item.payload )
										: null;
								const summary =
									taskContext ||
									TYPE_LABELS[ item.type ] ||
									__( 'sent an update', 'q2' );
								return (
									<li
										key={ item.id }
										className={
											item.read ? '' : 'is-unread'
										}
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
											<span className="q2-notification-avatar">
												<img
													src={ item.avatarUrl }
													alt=""
												/>
												<span className="q2-notification-type">
													<Icon
														icon={ typeIcon(
															item
														) }
														size={ 13 }
													/>
												</span>
											</span>
											<span>
												<span>
													<strong>
														{ item.actorName }
													</strong>{ ' ' }
													{ summary }{ ' ' }
													<strong>
														{ item.objectTitle }
													</strong>
												</span>
												{ item.objectExcerpt && (
													<small>
														{ item.objectExcerpt }
													</small>
												) }
												<time
													dateTime={ item.createdAt }
												>
													{ formatDate(
														item.createdAt
													) }
												</time>
											</span>
										</button>
									</li>
								);
							} ) }
						</ul>
					</section>
				) ) }
		</div>
	);
}
