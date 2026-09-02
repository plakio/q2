export function generateTaskId() {
	if ( typeof globalThis.crypto?.randomUUID === 'function' ) {
		return globalThis.crypto
			.randomUUID()
			.replace( /-/g, '' )
			.slice( 0, 16 );
	}

	return (
		Date.now().toString( 36 ) + Math.random().toString( 36 ).slice( 2, 10 )
	);
}
