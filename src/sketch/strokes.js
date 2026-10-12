/**
 * Immutable per-stroke history for the Sketch drawing block.
 *
 * Pure helpers with no WordPress dependencies so they stay unit-testable;
 * the React wiring lives in history.js.
 */

export const MAX_HISTORY = 50;

export function strokesEqual( left, right ) {
	if ( left === right ) {
		return true;
	}
	return JSON.stringify( left || [] ) === JSON.stringify( right || [] );
}

export function initialStrokeHistory( strokes = [] ) {
	return { past: [], present: strokes || [], future: [] };
}

export function recordStroke( history, strokes ) {
	const next = strokes || [];
	if ( strokesEqual( history.present, next ) ) {
		return history;
	}
	return {
		past: [ ...history.past, history.present ].slice( -MAX_HISTORY ),
		present: next,
		future: [],
	};
}

export function undoStroke( history ) {
	if ( history.past.length === 0 ) {
		return history;
	}
	return {
		past: history.past.slice( 0, -1 ),
		present: history.past[ history.past.length - 1 ],
		future: [ history.present, ...history.future ],
	};
}

export function redoStroke( history ) {
	if ( history.future.length === 0 ) {
		return history;
	}
	return {
		past: [ ...history.past, history.present ].slice( -MAX_HISTORY ),
		present: history.future[ 0 ],
		future: history.future.slice( 1 ),
	};
}

export function canUndoStroke( history ) {
	return history.past.length > 0;
}

export function canRedoStroke( history ) {
	return history.future.length > 0;
}

function pointToSegmentDistance( px, py, ax, ay, bx, by ) {
	const dx = bx - ax;
	const dy = by - ay;
	const lengthSquared = dx * dx + dy * dy;
	if ( lengthSquared === 0 ) {
		return Math.hypot( px - ax, py - ay );
	}
	const t = Math.min(
		1,
		Math.max( 0, ( ( px - ax ) * dx + ( py - ay ) * dy ) / lengthSquared )
	);
	return Math.hypot( px - ( ax + t * dx ), py - ( ay + t * dy ) );
}

/**
 * Finds the topmost stroke near a point, for the eraser tool.
 *
 * @param {Array}  strokes   Stored strokes ({stroke: [[x, y], …]}).
 * @param {number} x         Horizontal canvas coordinate.
 * @param {number} y         Vertical canvas coordinate.
 * @param {number} tolerance Hit radius in canvas units.
 * @return {number} Stroke index, or -1 when nothing is near the point.
 */
export function findStrokeAtPoint( strokes, x, y, tolerance = 10 ) {
	const list = Array.isArray( strokes ) ? strokes : [];
	for ( let index = list.length - 1; index >= 0; index-- ) {
		const points = list[ index ]?.stroke;
		if ( ! Array.isArray( points ) || points.length === 0 ) {
			continue;
		}
		if ( points.length === 1 ) {
			const [ sx = 0, sy = 0 ] = points[ 0 ];
			if ( Math.hypot( x - sx, y - sy ) <= tolerance ) {
				return index;
			}
			continue;
		}
		for ( let i = 0; i < points.length - 1; i++ ) {
			const [ ax = 0, ay = 0 ] = points[ i ];
			const [ bx = 0, by = 0 ] = points[ i + 1 ];
			if ( pointToSegmentDistance( x, y, ax, ay, bx, by ) <= tolerance ) {
				return index;
			}
		}
	}
	return -1;
}

export function removeStroke( strokes, index ) {
	const list = Array.isArray( strokes ) ? strokes : [];
	if ( index < 0 || index >= list.length ) {
		return list;
	}
	return list.filter( ( _, i ) => i !== index );
}
