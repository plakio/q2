export function filterPostIds( filter, feedMeta ) {
	return (
		{
			'new-posts': feedMeta.newPostIds,
			'new-comments': feedMeta.newCommentPostIds,
			mentions: feedMeta.mentionPostIds,
		}[ filter ] || null
	);
}

export function buildFeedPath( {
	page,
	perPage,
	canEdit,
	userId,
	filter,
	feedMeta,
	focusPostId,
} ) {
	const filterIds = filterPostIds( filter, feedMeta );
	if ( filterIds && filterIds.length === 0 ) {
		return null;
	}

	const parameters = [
		`per_page=${ perPage }`,
		`page=${ page }`,
		'_embed=author,wp:term,replies',
	];
	if ( canEdit ) {
		parameters.push( 'context=edit' );
	}
	if ( filter === 'my-posts' ) {
		parameters.push( `author=${ userId }` );
	}
	if ( focusPostId ) {
		parameters.push( `include=${ focusPostId }` );
	} else if ( filterIds ) {
		parameters.push( `include=${ filterIds.join( ',' ) }` );
	}

	return `/wp/v2/posts?${ parameters.join( '&' ) }`;
}
