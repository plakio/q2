import { useSketchEraser } from './eraser';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const STROKES = [
	{
		stroke: [
			[ 5, 5 ],
			[ 50, 5 ],
		],
		color: '#000',
	},
	{
		stroke: [
			[ 5, 50 ],
			[ 50, 50 ],
		],
		color: '#000',
	},
];

function Harness( { strokes, onChange, erasing } ) {
	useSketchEraser( { strokes, setAttributes: onChange, erasing } );
	return null;
}

async function renderHarness( props ) {
	// eslint-disable-next-line import/no-extraneous-dependencies -- test renderer ships with @wordpress/element
	const { act } = require( 'react' );
	const { createRoot } = require( '@wordpress/element' );
	document.body.innerHTML =
		'<figure class="wp-block-a8c-sketch"><svg></svg></figure>';
	const container = document.createElement( 'div' );
	document.body.appendChild( container );
	const root = createRoot( container );
	await act( async () => {
		root.render( <Harness { ...props } /> );
	} );
	return { root, container };
}

function pointerDownAt( x, y ) {
	const svg = document.querySelector( '.wp-block-a8c-sketch svg' );
	svg.dispatchEvent(
		new window.MouseEvent( 'pointerdown', {
			bubbles: true,
			cancelable: true,
			clientX: x,
			clientY: y,
			button: 0,
		} )
	);
}

describe( 'sketch eraser dispatch', () => {
	afterEach( () => {
		document.body.innerHTML = '';
	} );

	it( 'does nothing while erase mode is off', async () => {
		const onChange = jest.fn();
		// eslint-disable-next-line import/no-extraneous-dependencies -- test renderer ships with @wordpress/element
		const { act } = require( 'react' );
		const { root, container } = await renderHarness( {
			strokes: STROKES,
			onChange,
			erasing: false,
		} );
		pointerDownAt( 25, 5 );
		expect( onChange ).not.toHaveBeenCalled();
		await act( async () => {
			root.unmount();
		} );
		container.remove();
	} );

	it( 'removes the stroke under the pointer when erasing', async () => {
		const onChange = jest.fn();
		// eslint-disable-next-line import/no-extraneous-dependencies -- test renderer ships with @wordpress/element
		const { act } = require( 'react' );
		const { root, container } = await renderHarness( {
			strokes: STROKES,
			onChange,
			erasing: true,
		} );
		expect( document.body.classList.contains( 'is-q2-erasing' ) ).toBe(
			true
		);
		pointerDownAt( 25, 5 );
		expect( onChange ).toHaveBeenCalledTimes( 1 );
		expect( onChange.mock.calls[ 0 ][ 0 ] ).toEqual( {
			strokes: [ STROKES[ 1 ] ],
		} );
		await act( async () => {
			root.unmount();
		} );
		expect( document.body.classList.contains( 'is-q2-erasing' ) ).toBe(
			false
		);
		container.remove();
	} );

	it( 'ignores presses far from every stroke', async () => {
		const onChange = jest.fn();
		// eslint-disable-next-line import/no-extraneous-dependencies -- test renderer ships with @wordpress/element
		const { act } = require( 'react' );
		const { root, container } = await renderHarness( {
			strokes: STROKES,
			onChange,
			erasing: true,
		} );
		pointerDownAt( 200, 200 );
		expect( onChange ).not.toHaveBeenCalled();
		await act( async () => {
			root.unmount();
		} );
		container.remove();
	} );
} );
