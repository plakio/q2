import {
	routeDetailFromHash,
	routeDetailFromPath,
	routeFromHash,
	routeFromPath,
} from './routes';

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

describe( 'routeDetailFromPath', () => {
	it( 'returns the page path from a pretty deep link', () => {
		expect(
			routeDetailFromPath( '/q2/', '/q2/pages/guides/onboarding/' )
		).toBe( 'guides/onboarding' );
	} );

	it( 'returns the post slug from a feed deep link', () => {
		expect( routeDetailFromPath( '/q2/', '/q2/feed/hello-world/' ) ).toBe(
			'hello-world'
		);
	} );

	it( 'is empty for a top-level route', () => {
		expect( routeDetailFromPath( '/q2/', '/q2/pages/' ) ).toBe( '' );
	} );
} );

describe( 'routeDetailFromHash', () => {
	it( 'returns the hash detail segment', () => {
		expect( routeDetailFromHash( '#pages/guides/onboarding' ) ).toBe(
			'guides/onboarding'
		);
	} );

	it( 'is empty for a bare section', () => {
		expect( routeDetailFromHash( '#pages' ) ).toBe( '' );
	} );
} );
