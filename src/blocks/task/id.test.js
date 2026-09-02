import { generateTaskId } from './id';

describe( 'task IDs', () => {
	it( 'creates non-empty IDs without UUID separators', () => {
		const first = generateTaskId();
		const second = generateTaskId();

		expect( first ).toBeTruthy();
		expect( first ).not.toContain( '-' );
		expect( second ).not.toBe( first );
	} );
} );
