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
