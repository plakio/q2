import { buildCommentTree } from './tree';

describe( 'buildCommentTree', () => {
	it( 'groups threaded replies beneath their parent', () => {
		const root = { id: 1, parent: 0 };
		const reply = { id: 2, parent: 1 };
		const tree = buildCommentTree( [ root, reply ] );

		expect( tree.get( 0 ) ).toEqual( [ root ] );
		expect( tree.get( 1 ) ).toEqual( [ reply ] );
	} );

	it( 'keeps orphaned replies visible at the root', () => {
		const orphan = { id: 3, parent: 99 };
		const tree = buildCommentTree( [ orphan ] );

		expect( tree.get( 0 ) ).toEqual( [ orphan ] );
	} );
} );
