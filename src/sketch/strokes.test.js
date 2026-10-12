import {
	canRedoStroke,
	canUndoStroke,
	findStrokeAtPoint,
	initialStrokeHistory,
	recordStroke,
	redoStroke,
	removeStroke,
	undoStroke,
} from './strokes';

const STROKE_A = [ { stroke: [ [ 0, 0 ] ], color: '#000' } ];
const STROKE_B = [ { stroke: [ [ 1, 1 ] ], color: '#f00' } ];

describe( 'sketch stroke history', () => {
	it( 'starts empty without undo or redo', () => {
		const history = initialStrokeHistory();
		expect( history.present ).toEqual( [] );
		expect( canUndoStroke( history ) ).toBe( false );
		expect( canRedoStroke( history ) ).toBe( false );
	} );

	it( 'records new strokes and clears the redo stack', () => {
		let history = initialStrokeHistory();
		history = recordStroke( history, STROKE_A );
		expect( canUndoStroke( history ) ).toBe( true );
		expect( canRedoStroke( history ) ).toBe( false );

		history = undoStroke( history );
		expect( canRedoStroke( history ) ).toBe( true );

		history = recordStroke( history, STROKE_B );
		expect( history.present ).toEqual( STROKE_B );
		expect( canRedoStroke( history ) ).toBe( false );
	} );

	it( 'ignores unchanged strokes', () => {
		const history = initialStrokeHistory( STROKE_A );
		expect( recordStroke( history, [ ...STROKE_A ] ) ).toBe( history );
	} );

	it( 'undoes back through every stroke, including a clear', () => {
		let history = initialStrokeHistory();
		history = recordStroke( history, STROKE_A );
		history = recordStroke( history, [ ...STROKE_A, ...STROKE_B ] );
		history = recordStroke( history, [] );

		history = undoStroke( history );
		expect( history.present ).toEqual( [ ...STROKE_A, ...STROKE_B ] );
		history = undoStroke( history );
		expect( history.present ).toEqual( STROKE_A );
		history = undoStroke( history );
		expect( history.present ).toEqual( [] );
		expect( canUndoStroke( history ) ).toBe( false );

		history = redoStroke( history );
		expect( history.present ).toEqual( STROKE_A );
	} );

	it( 'is a no-op at the ends of the stacks', () => {
		const history = initialStrokeHistory( STROKE_A );
		expect( undoStroke( history ) ).toBe( history );
		expect( redoStroke( history ) ).toBe( history );
	} );
} );

describe( 'sketch eraser hit-testing', () => {
	const LINE = [
		{
			stroke: [
				[ 0, 0 ],
				[ 100, 0 ],
			],
			color: '#000',
		},
	];
	const DOT = [ { stroke: [ [ 50, 50 ] ], color: '#000' } ];

	it( 'hits a stroke near its path', () => {
		expect( findStrokeAtPoint( LINE, 50, 3 ) ).toBe( 0 );
		expect( findStrokeAtPoint( LINE, 50, 30 ) ).toBe( -1 );
	} );

	it( 'hits single-point strokes within tolerance', () => {
		expect( findStrokeAtPoint( DOT, 55, 55 ) ).toBe( 0 );
		expect( findStrokeAtPoint( DOT, 0, 0 ) ).toBe( -1 );
	} );

	it( 'prefers the topmost stroke', () => {
		const stacked = [ ...LINE, ...DOT ];
		expect( findStrokeAtPoint( stacked, 55, 55 ) ).toBe( 1 );
	} );

	it( 'ignores empty or malformed strokes', () => {
		expect( findStrokeAtPoint( [], 0, 0 ) ).toBe( -1 );
		expect( findStrokeAtPoint( null, 0, 0 ) ).toBe( -1 );
		expect( findStrokeAtPoint( [ {} ], 0, 0 ) ).toBe( -1 );
	} );

	it( 'removes a stroke by index', () => {
		const stacked = [ ...LINE, ...DOT ];
		expect( removeStroke( stacked, 0 ) ).toEqual( DOT );
		expect( removeStroke( stacked, 5 ) ).toBe( stacked );
	} );
} );
