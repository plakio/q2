import apiFetch from '@wordpress/api-fetch';
import { useEffect, useState } from '@wordpress/element';
import { __, sprintf, _n } from '@wordpress/i18n';
import StateMessage from '../components/StateMessage';

const SCOPE_OPTIONS = [
	{ key: 'mine', label: __( 'Assigned to me', 'q2' ) },
	{ key: 'all', label: __( 'All tasks', 'q2' ) },
];

function toggleLabel( task, busyId ) {
	if ( busyId === task.blockId ) {
		return __( 'Updating…', 'q2' );
	}
	if ( 'done' === task.status ) {
		return __( 'Mark active', 'q2' );
	}
	return __( 'Mark done', 'q2' );
}

function formatDate( value ) {
	if ( ! value ) {
		return '';
	}
	return new Intl.DateTimeFormat( undefined, {
		dateStyle: 'medium',
	} ).format( new Date( value ) );
}

export default function TasksScreen() {
	const [ scope, setScope ] = useState( 'mine' );
	const [ tasks, setTasks ] = useState( [] );
	const [ status, setStatus ] = useState( 'loading' );
	const [ overdueOnly, setOverdueOnly ] = useState( false );
	const [ busyId, setBusyId ] = useState( '' );
	const [ errorMessage, setErrorMessage ] = useState( '' );

	const reload = () => {
		const params = new URLSearchParams( {
			scope,
			perPage: '50',
			page: '1',
		} );
		if ( overdueOnly ) {
			params.set( 'overdue', new Date().toISOString().slice( 0, 10 ) );
		}
		setStatus( 'loading' );
		apiFetch( { path: `/q2/v1/tasks?${ params.toString() }` } )
			.then( ( result ) => {
				setTasks( result.items || [] );
				setStatus( 'ready' );
			} )
			.catch( () => setStatus( 'error' ) );
	};

	useEffect( reload, [ scope, overdueOnly ] );

	const toggleStatus = async ( task ) => {
		const next = 'done' === task.status ? 'todo' : 'done';
		setBusyId( task.blockId );
		setErrorMessage( '' );
		try {
			await apiFetch( {
				path: `/q2/v1/tasks/${ task.blockId }`,
				method: 'PATCH',
				data: { status: next },
			} );
			setTasks( ( current ) =>
				current.map( ( t ) =>
					t.blockId === task.blockId ? { ...t, status: next } : t
				)
			);
		} catch ( reason ) {
			setErrorMessage(
				reason.message || __( 'The task could not be updated.', 'q2' )
			);
		} finally {
			setBusyId( '' );
		}
	};

	const today = new Date();
	const overdue = tasks.filter( ( t ) => {
		if ( ! t.dueDate ) {
			return false;
		}
		return new Date( t.dueDate ) < today && t.status !== 'done';
	} );

	return (
		<div className="q2-column q2-tasks-screen">
			<header className="q2-page-header">
				<div>
					<span className="q2-eyebrow">
						{ __( 'Workspace', 'q2' ) }
					</span>
					<h1>{ __( 'Tasks', 'q2' ) }</h1>
				</div>
				<div className="q2-tasks-filters">
					{ SCOPE_OPTIONS.map( ( option ) => (
						<button
							key={ option.key }
							type="button"
							className={
								scope === option.key ? 'is-active' : ''
							}
							onClick={ () => setScope( option.key ) }
						>
							{ option.label }
						</button>
					) ) }
					<label
						htmlFor="q2-tasks-overdue"
						className="q2-tasks-overdue-toggle"
					>
						<input
							id="q2-tasks-overdue"
							type="checkbox"
							checked={ overdueOnly }
							onChange={ ( e ) =>
								setOverdueOnly( e.target.checked )
							}
						/>
						{ __( 'Overdue only', 'q2' ) }
					</label>
				</div>
			</header>
			{ errorMessage && (
				<p role="alert" className="q2-tasks-error">
					{ errorMessage }
				</p>
			) }
			{ overdue.length > 0 && (
				<p
					className="q2-tasks-overdue"
					role={ overdueOnly ? 'status' : undefined }
				>
					{ sprintf(
						/* translators: %d: number of overdue tasks. */
						_n(
							'%d overdue task',
							'%d overdue tasks',
							overdue.length,
							'q2'
						),
						overdue.length
					) }
				</p>
			) }
			{ status === 'loading' && <p>{ __( 'Loading tasks…', 'q2' ) }</p> }
			{ status === 'error' && (
				<StateMessage>
					<strong>
						{ __( 'Tasks could not be loaded.', 'q2' ) }
					</strong>
				</StateMessage>
			) }
			{ status === 'ready' && tasks.length === 0 && (
				<StateMessage>
					<strong>
						{ 'mine' === scope
							? __( 'No tasks are assigned to you yet.', 'q2' )
							: __( 'No tasks match the current filter.', 'q2' ) }
					</strong>
					<span>
						{ __(
							'Drop a Q2 Task block into a post or page to start tracking work.',
							'q2'
						) }
					</span>
				</StateMessage>
			) }
			{ status === 'ready' && tasks.length > 0 && (
				<ul className="q2-tasks-list">
					{ tasks.map( ( task ) => {
						const isOverdue =
							task.dueDate &&
							new Date( task.dueDate ) < today &&
							task.status !== 'done';
						return (
							<li
								key={ `${ task.blockId }-${ task.id }` }
								className={ `q2-task-row is-${ task.status }${
									isOverdue ? ' is-overdue' : ''
								}` }
							>
								<div>
									<strong>{ task.title }</strong>
									<a
										className="q2-task-post"
										href={ `#pages&focusPost=${ task.postId }` }
									>
										{ task.postTitle ||
											__( 'Untitled', 'q2' ) }
									</a>
								</div>
								<div className="q2-task-meta">
									<span
										className={ `q2-task-status is-${ task.status }` }
									>
										{ task.status }
									</span>
									{ task.dueDate && (
										<time dateTime={ task.dueDate }>
											{ formatDate( task.dueDate ) }
										</time>
									) }
									{ task.assignees?.length > 0 && (
										<ul className="q2-task-assigned-row">
											{ task.assignees.map( ( a ) => (
												<li
													key={ a.id }
													title={ a.name }
												>
													<img
														src={ a.avatarUrl }
														alt={ a.name }
													/>
												</li>
											) ) }
										</ul>
									) }
									<button
										type="button"
										className="q2-task-toggle"
										onClick={ () => toggleStatus( task ) }
										disabled={ busyId === task.blockId }
										aria-pressed={ 'done' === task.status }
									>
										{ toggleLabel( task, busyId ) }
									</button>
								</div>
							</li>
						);
					} ) }
				</ul>
			) }
		</div>
	);
}
