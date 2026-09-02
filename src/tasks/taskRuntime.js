import apiFetch from '@wordpress/api-fetch';
import { __ } from '@wordpress/i18n';

function applyStatus( task, status ) {
	const toggle = task.querySelector( '[data-q2-task-toggle]' );
	task.dataset.status = status;
	if ( toggle ) {
		const done = status === 'done';
		toggle.setAttribute( 'aria-checked', String( done ) );
		toggle.setAttribute(
			'aria-label',
			done
				? __( 'Mark task as active', 'q2' )
				: __( 'Mark task as done', 'q2' )
		);
	}
}

document.addEventListener( 'click', async ( event ) => {
	const toggle = event.target.closest?.( '[data-q2-task-toggle]' );
	if ( ! toggle || toggle.closest( '.block-editor-block-list__block' ) ) {
		return;
	}

	const task = toggle.closest( '.q2-task[data-block-id]' );
	const blockId = task?.dataset.blockId;
	if ( ! task || ! blockId || toggle.disabled ) {
		return;
	}

	const previousStatus = task.dataset.status || 'todo';
	const nextStatus = previousStatus === 'done' ? 'todo' : 'done';
	toggle.disabled = true;
	applyStatus( task, nextStatus );

	try {
		await apiFetch( {
			path: `/q2/v1/tasks/${ encodeURIComponent( blockId ) }`,
			method: 'PATCH',
			data: { status: nextStatus },
		} );
	} catch {
		applyStatus( task, previousStatus );
	} finally {
		toggle.disabled = false;
	}
} );
