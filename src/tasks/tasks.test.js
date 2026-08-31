function toggleLabel( task, busyId ) {
	if ( busyId === task.blockId ) {
		return 'Updating…';
	}
	if ( 'done' === task.status ) {
		return 'Mark active';
	}
	return 'Mark done';
}

describe( 'tasks screen helpers', () => {
	it( 'shows "Updating…" while a specific task is busy', () => {
		expect( toggleLabel( { blockId: 'abc', status: 'todo' }, 'abc' ) ).toBe(
			'Updating…'
		);
	} );

	it( 'offers revert when the task is already done', () => {
		expect( toggleLabel( { blockId: 'abc', status: 'done' }, '' ) ).toBe(
			'Mark active'
		);
	} );

	it( 'offers completion when the task is not done', () => {
		expect( toggleLabel( { blockId: 'abc', status: 'todo' }, '' ) ).toBe(
			'Mark done'
		);
	} );
} );
