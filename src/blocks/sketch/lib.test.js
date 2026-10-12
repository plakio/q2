import { DEFAULT_PRESET, getSvgPathFromStroke, presets } from './lib';

describe( 'sketch drawing primitives', () => {
	it( 'defaults to the thinnest brush', () => {
		expect( DEFAULT_PRESET ).toBe( 0 );
		expect( presets[ 0 ].size ).toBeLessThan( presets[ 1 ].size );
		expect( presets[ 1 ].size ).toBeLessThan( presets[ 2 ].size );
	} );

	it( 'returns an empty path for fewer than four points', () => {
		expect( getSvgPathFromStroke( [] ) ).toBe( '' );
		expect(
			getSvgPathFromStroke( [
				[ 0, 0 ],
				[ 1, 1 ],
			] )
		).toBe( '' );
	} );

	it( 'builds a closed path from outline points', () => {
		const d = getSvgPathFromStroke( [
			[ 0, 0 ],
			[ 10, 0 ],
			[ 10, 10 ],
			[ 0, 10 ],
		] );
		expect( d.startsWith( 'M0.00,0.00' ) ).toBe( true );
		expect( d.endsWith( 'Z' ) ).toBe( true );
	} );
} );
