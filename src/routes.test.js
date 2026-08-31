import { routeFromHash, routeFromPath } from './routes';

describe( 'routeFromPath', () => {
	it( 'uses the feed for the application root', () => {
		expect( routeFromPath( '/q2/', '/q2/' ) ).toBe( 'feed' );
	} );

	it( 'returns the first nested application segment', () => {
		expect( routeFromPath( '/q2/', '/q2/notifications/' ) ).toBe(
			'notifications'
		);
	} );

	it( 'supports WordPress installed in a subdirectory', () => {
		expect(
			routeFromPath( '/wordpress/q2/', '/wordpress/q2/pages/' )
		).toBe( 'pages' );
	} );
} );

describe( 'routeFromHash', () => {
	it( 'uses the feed when no section is selected', () => {
		expect( routeFromHash( '' ) ).toBe( 'feed' );
	} );

	it( 'returns a home application section', () => {
		expect( routeFromHash( '#notifications' ) ).toBe( 'notifications' );
	} );
} );
