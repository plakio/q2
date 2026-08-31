function describeTaskPayload( type, payload ) {
	if ( 'task_assigned' !== type || ! payload ) {
		return null;
	}
	const taskTitle = payload.title || 'Untitled task';
	if ( payload.due_date ) {
		return `task “${ taskTitle }” (due ${ payload.due_date })`;
	}
	return `task “${ taskTitle }”`;
}

function summarise( buckets ) {
	const total = buckets.todo + buckets.in_progress + buckets.done;
	return { total, done: buckets.done, overdue: buckets.overdue };
}

describe( 'notifications helpers', () => {
	it( 'returns a labelled task context when due date is provided', () => {
		expect(
			describeTaskPayload( 'task_assigned', {
				title: 'Send report',
				due_date: '2026-09-01',
			} )
		).toBe( 'task “Send report” (due 2026-09-01)' );
	} );

	it( 'falls back to untitled and skips the due suffix when absent', () => {
		expect( describeTaskPayload( 'task_assigned', { title: '' } ) ).toBe(
			'task “Untitled task”'
		);
	} );

	it( 'returns null for non-task notifications', () => {
		expect( describeTaskPayload( 'mention', null ) ).toBeNull();
		expect( describeTaskPayload( 'like', { title: 'x' } ) ).toBeNull();
	} );
} );

describe( 'project status summary', () => {
	it( 'returns totals, done and overdue counts from the buckets', () => {
		const result = summarise( {
			todo: 2,
			in_progress: 1,
			done: 4,
			overdue: 1,
		} );
		expect( result ).toEqual( { total: 7, done: 4, overdue: 1 } );
	} );

	it( 'handles empty buckets', () => {
		expect(
			summarise( { todo: 0, in_progress: 0, done: 0, overdue: 0 } )
		).toEqual( { total: 0, done: 0, overdue: 0 } );
	} );
} );
