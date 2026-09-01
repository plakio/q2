import { useCallback, useRef, useState } from '@wordpress/element';
import { serialize } from '@wordpress/blocks';

function arraysEqual( a, b ) {
	if ( a === b ) {
		return true;
	}
	if ( ! a || ! b || a.length !== b.length ) {
		return false;
	}
	for ( let i = 0; i < a.length; i++ ) {
		const left = serialize( a[ i ] );
		const right = serialize( b[ i ] );
		if ( left !== right ) {
			return false;
		}
	}
	return true;
}

export default function useBlockHistory( initialBlocks ) {
	const [ blocks, setBlocks ] = useState( initialBlocks );
	const [ history, setHistory ] = useState( () => [ initialBlocks ] );
	const [ historyIndex, setHistoryIndex ] = useState( 0 );
	const lastCommittedRef = useRef( initialBlocks );

	const commitBlocks = useCallback(
		( next ) => {
			setBlocks( ( current ) => {
				if ( arraysEqual( current, next ) ) {
					return current;
				}
				lastCommittedRef.current = next;
				return next;
			} );
			setHistory( ( past ) => {
				const trimmed = past.slice( 0, historyIndex + 1 );
				const last = trimmed[ trimmed.length - 1 ];
				if ( last && arraysEqual( last, next ) ) {
					return past;
				}
				return [ ...trimmed, next ];
			} );
			setHistoryIndex( ( value ) => value + 1 );
		},
		[ historyIndex ]
	);

	const replaceBlocks = useCallback( ( next ) => {
		lastCommittedRef.current = next;
		setBlocks( next );
		setHistory( [ next ] );
		setHistoryIndex( 0 );
	}, [] );

	const undo = useCallback( () => {
		if ( historyIndex <= 0 ) {
			return;
		}
		const nextIndex = historyIndex - 1;
		setHistoryIndex( nextIndex );
		setBlocks( history[ nextIndex ] );
		lastCommittedRef.current = history[ nextIndex ];
	}, [ history, historyIndex ] );

	const redo = useCallback( () => {
		if ( historyIndex >= history.length - 1 ) {
			return;
		}
		const nextIndex = historyIndex + 1;
		setHistoryIndex( nextIndex );
		setBlocks( history[ nextIndex ] );
		lastCommittedRef.current = history[ nextIndex ];
	}, [ history, historyIndex ] );

	return {
		blocks,
		commitBlocks,
		replaceBlocks,
		undo,
		redo,
		canUndo: historyIndex > 0,
		canRedo: historyIndex < history.length - 1,
		lastCommittedRef,
	};
}
