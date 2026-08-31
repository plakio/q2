/**
 * Q2 Project Status block — derives a task summary from sibling task blocks.
 */
import apiFetch from '@wordpress/api-fetch';
import { useBlockProps, InnerBlocks } from '@wordpress/block-editor';
import { useEffect, useState } from '@wordpress/element';
import { __, sprintf, _n } from '@wordpress/i18n';

function summarise( tasks ) {
	const buckets = { todo: [], in_progress: [], done: [] };
	for ( const task of tasks ) {
		const key = buckets[ task.status ] ? task.status : 'todo';
		buckets[ key ].push( task );
	}
	return buckets;
}

export default function Edit( { clientId, context } ) {
	const blockProps = useBlockProps( { className: 'q2-project-status' } );
	const postId = context?.postId || window.q2Settings?.currentPostId || 0;
	const [ tasks, setTasks ] = useState( [] );

	useEffect( () => {
		if ( ! postId ) {
			return;
		}
		let active = true;
		apiFetch( { path: `/q2/v1/posts/${ postId }/tasks` } )
			.then( ( result ) => {
				if ( active ) {
					setTasks( Array.isArray( result ) ? result : [] );
				}
			} )
			.catch( () => {} );
		return () => {
			active = false;
		};
	}, [ postId ] );

	const buckets = summarise( tasks );
	const total = tasks.length;
	const done = buckets.done.length;
	const overdue = tasks.filter( ( task ) => {
		return (
			task.dueDate &&
			new Date( task.dueDate ) < new Date() &&
			task.status !== 'done'
		);
	} ).length;

	return (
		<div { ...blockProps }>
			<header>
				<h3>{ __( 'Project status', 'q2' ) }</h3>
				<p>
					{ sprintf(
						/* translators: 1: done tasks, 2: total tasks. */
						__( '%1$d of %2$d tasks done', 'q2' ),
						done,
						total
					) }
					{ overdue > 0 && (
						<>
							{ ' · ' }
							{ sprintf(
								/* translators: %d: overdue task count. */
								_n( '%d overdue', '%d overdue', overdue, 'q2' ),
								overdue
							) }
						</>
					) }
				</p>
			</header>
			<ul className="q2-project-status-summary">
				<li className="is-todo">
					<strong>{ buckets.todo.length }</strong>
					<span>{ __( 'To do', 'q2' ) }</span>
				</li>
				<li className="is-progress">
					<strong>{ buckets.in_progress.length }</strong>
					<span>{ __( 'In progress', 'q2' ) }</span>
				</li>
				<li className="is-done">
					<strong>{ buckets.done.length }</strong>
					<span>{ __( 'Done', 'q2' ) }</span>
				</li>
			</ul>
			<InnerBlocks allowedBlocks={ [ 'q2/task' ] } />
			<p className="q2-project-status-hint" data-block-uid={ clientId }>
				{ __(
					'Project Status summarises Q2 Task blocks in this post. Drop task blocks above or below.',
					'q2'
				) }
			</p>
		</div>
	);
}

export function Save() {
	return (
		<div className="q2-project-status" data-block="q2/project-status">
			<InnerBlocks.Content />
		</div>
	);
}
