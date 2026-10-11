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

function safeDecode( value ) {
	try {
		return decodeURIComponent( value );
	} catch {
		return value;
	}
}

export function routeDetailFromPath(
	appUrl,
	pathname,
	origin = 'https://example.test'
) {
	const base = new URL( appUrl, origin ).pathname.replace( /\/$/, '' );
	const segments = pathname
		.slice( base.length )
		.replace( /^\//, '' )
		.split( '/' )
		.filter( Boolean );
	segments.shift();
	return safeDecode( segments.join( '/' ) );
}

export function routeDetailFromHash( hash ) {
	const segments = hash.replace( /^#\/?/, '' ).split( '/' ).filter( Boolean );
	segments.shift();
	return safeDecode( segments.join( '/' ) );
}
