export function routeFromPath(
	appUrl,
	pathname,
	origin = 'https://example.test'
) {
	const base = new URL( appUrl, origin ).pathname.replace( /\/$/, '' );
	const path = pathname.slice( base.length ).replace( /^\//, '' );
	return path.split( '/' )[ 0 ] || 'feed';
}

export function routeFromHash( hash ) {
	return hash.replace( /^#\/?/, '' ).split( '/' )[ 0 ] || 'feed';
}
