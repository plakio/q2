/**
 * Lets the Sketch drawing block receive full pointer gestures in Q2 editors.
 *
 * Gutenberg marks every movable block as draggable, so pressing and moving
 * on the sketch canvas starts a native block drag instead: the browser
 * fires pointercancel and the stroke dies after its first point, leaving
 * only dots. Preventing the mousedown default inside an already-selected
 * sketch figure stops drag initiation while leaving every handler
 * (including block selection) untouched.
 */

function onMouseDown( event ) {
	if ( event.button !== 0 ) {
		return;
	}
	const target = event.target;
	if ( ! target || typeof target.closest !== 'function' ) {
		return;
	}
	const figure = target.closest( '.wp-block-a8c-sketch' );
	if (
		! figure ||
		! figure.closest( '.q2-p2-canvas, .q2-block-editor-canvas' ) ||
		! figure.closest( '.is-selected' )
	) {
		return;
	}
	event.preventDefault();
}

if ( typeof document !== 'undefined' ) {
	document.addEventListener( 'mousedown', onMouseDown, true );
}
