/**
 * Tests for the Sketch drawing-gesture guard.
 */
import './support';

function fireMouseDown( html, button = 0 ) {
	document.body.innerHTML = html;
	const svg = document.querySelector( 'svg' );
	const event = new window.MouseEvent( 'mousedown', {
		button,
		bubbles: true,
		cancelable: true,
	} );
	svg.dispatchEvent( event );
	return event.defaultPrevented;
}

describe( 'sketch drawing guard', () => {
	afterEach( () => {
		document.body.innerHTML = '';
	} );

	it( 'prevents the default on a selected sketch canvas in Q2 editors', () => {
		expect(
			fireMouseDown(
				'<div class="q2-p2-canvas"><figure class="wp-block-a8c-sketch is-selected"><svg></svg></figure></div>'
			)
		).toBe( true );
	} );

	it( 'leaves the first click alone so an unselected block still selects', () => {
		expect(
			fireMouseDown(
				'<div class="q2-p2-canvas"><figure class="wp-block-a8c-sketch"><svg></svg></figure></div>'
			)
		).toBe( false );
	} );

	it( 'ignores sketch blocks outside Q2 canvases', () => {
		expect(
			fireMouseDown(
				'<div class="other"><figure class="wp-block-a8c-sketch is-selected"><svg></svg></figure></div>'
			)
		).toBe( false );
	} );

	it( 'ignores non-primary buttons', () => {
		expect(
			fireMouseDown(
				'<div class="q2-p2-canvas"><figure class="wp-block-a8c-sketch is-selected"><svg></svg></figure></div>',
				2
			)
		).toBe( false );
	} );
} );
