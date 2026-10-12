/**
 * Eraser dispatch for the Sketch drawing block.
 *
 * While erase mode is on, pointer presses on any sketch canvas delete the
 * topmost stroke under the pointer instead of drawing. Listeners attach to
 * every same-origin document in the frame tree (the editor canvas may live
 * in nested blob iframes whose documents are replaced as content changes),
 * and coordinates resolve through getScreenCTM so nested frames and CSS
 * transforms stay correct.
 */
import { useEffect, useRef } from '@wordpress/element';
import { findStrokeAtPoint, removeStroke } from './strokes';

const CURSOR_STYLE_ID = 'q2-eraser-cursor';
const ERASING_CLASS = 'is-q2-erasing';

function svgPoint( svg, clientX, clientY ) {
	try {
		if ( svg.createSVGPoint && svg.getScreenCTM ) {
			const matrix = svg.getScreenCTM();
			if ( matrix ) {
				const point = svg.createSVGPoint();
				point.x = clientX;
				point.y = clientY;
				const local = point.matrixTransform( matrix.inverse() );
				return { x: local.x, y: local.y };
			}
		}
	} catch {
		// Fall through to bounding-rect math below.
	}
	const rect = svg.getBoundingClientRect();
	return { x: clientX - rect.left, y: clientY - rect.top };
}

function ensureCursorStyle( doc ) {
	if ( doc.querySelector( `style[data-${ CURSOR_STYLE_ID }]` ) ) {
		return;
	}
	const style = doc.createElement( 'style' );
	style.setAttribute( `data-${ CURSOR_STYLE_ID }`, '1' );
	style.textContent = `.${ ERASING_CLASS } .wp-block-a8c-sketch svg,.${ ERASING_CLASS } .wp-block-q2-sketch svg{cursor:crosshair}`;
	( doc.head || doc.documentElement ).appendChild( style );
}

function forEachDocument( rootDoc, callback ) {
	const seen = new Set();
	const walk = ( doc ) => {
		if ( ! doc || seen.has( doc ) ) {
			return;
		}
		seen.add( doc );
		callback( doc );
		let frames;
		try {
			frames = doc.querySelectorAll( 'iframe' );
		} catch {
			return;
		}
		frames.forEach( ( frame ) => {
			try {
				if ( frame.contentDocument ) {
					walk( frame.contentDocument );
				}
			} catch {
				// Cross-origin frame; skip.
			}
		} );
	};
	walk( rootDoc );
}

export function useSketchEraser( { strokes, setAttributes, erasing } ) {
	const stateRef = useRef( null );
	stateRef.current = { strokes: strokes || [], setAttributes };

	useEffect( () => {
		if ( ! erasing || typeof document === 'undefined' ) {
			return undefined;
		}
		const attached = new Set();
		const onPointerDown = ( event ) => {
			if ( event.button !== undefined && event.button !== 0 ) {
				return;
			}
			const target = event.target;
			if ( ! target || typeof target.closest !== 'function' ) {
				return;
			}
			const svg = target.closest(
				'.wp-block-a8c-sketch svg, .wp-block-q2-sketch svg'
			);
			if ( ! svg ) {
				return;
			}
			const { x, y } = svgPoint( svg, event.clientX, event.clientY );
			const current = stateRef.current;
			const index = findStrokeAtPoint( current.strokes, x, y );
			if ( index < 0 ) {
				return;
			}
			event.preventDefault();
			event.stopPropagation();
			current.setAttributes( {
				strokes: removeStroke( current.strokes, index ),
			} );
		};
		const attach = ( doc ) => {
			if ( attached.has( doc ) ) {
				return;
			}
			try {
				ensureCursorStyle( doc );
				doc.addEventListener( 'pointerdown', onPointerDown, true );
				doc.body?.classList?.add( ERASING_CLASS );
				attached.add( doc );
			} catch {
				// Detached document; skip.
			}
		};
		const scan = () => forEachDocument( document, attach );
		scan();
		let observer = null;
		try {
			observer = new window.MutationObserver( scan );
			observer.observe( document, { childList: true, subtree: true } );
		} catch {
			// MutationObserver unavailable; the interval below still covers.
			observer = null;
		}
		const timer = window.setInterval( scan, 1000 );
		return () => {
			window.clearInterval( timer );
			observer?.disconnect();
			attached.forEach( ( doc ) => {
				try {
					doc.removeEventListener(
						'pointerdown',
						onPointerDown,
						true
					);
					doc.body?.classList?.remove( ERASING_CLASS );
				} catch {
					// Detached document; skip.
				}
			} );
		};
	}, [ erasing ] );
}
