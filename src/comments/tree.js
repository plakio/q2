export function buildCommentTree( comments ) {
	const children = new Map();
	const ids = new Set( comments.map( ( item ) => item.id ) );
	comments.forEach( ( item ) => {
		const parent = ids.has( item.parent ) ? item.parent : 0;
		children.set( parent, [ ...( children.get( parent ) || [] ), item ] );
	} );
	return children;
}
