import { buildFeedPath, filterPostIds } from './query';

const meta = {
	newPostIds: [ 8, 5 ],
	newCommentPostIds: [ 3 ],
	mentionPostIds: [],
};

describe( 'feed queries', () => {
	it( 'maps collaboration filters to post IDs', () => {
		expect( filterPostIds( 'new-comments', meta ) ).toEqual( [ 3 ] );
		expect( filterPostIds( 'all', meta ) ).toBeNull();
	} );

	it( 'does not request a known-empty filtered feed', () => {
		expect(
			buildFeedPath( {
				page: 1,
				perPage: 10,
				canEdit: true,
				userId: 2,
				filter: 'mentions',
				feedMeta: meta,
				focusPostId: 0,
			} )
		).toBeNull();
	} );

	it( 'builds an editable My Posts request', () => {
		expect(
			buildFeedPath( {
				page: 2,
				perPage: 10,
				canEdit: true,
				userId: 7,
				filter: 'my-posts',
				feedMeta: meta,
				focusPostId: 0,
			} )
		).toContain( 'context=edit&author=7' );
	} );
} );
