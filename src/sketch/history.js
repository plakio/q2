/**
 * Per-stroke undo/redo for the Sketch drawing block.
 *
 * Sketch is a third-party block, so instead of patching it we wrap its Edit
 * component: the wrapper tracks the `strokes` attribute in an immutable
 * history (see strokes.js) and exposes undo/redo toolbar buttons that
 * restore earlier states (including recovering from "Clear canvas").
 */
import { BlockControls } from '@wordpress/block-editor';
import { ToolbarButton, ToolbarGroup } from '@wordpress/components';
import { useEffect, useState } from '@wordpress/element';
import { addFilter } from '@wordpress/hooks';
import { __ } from '@wordpress/i18n';
import { redo as redoIcon, undo as undoIcon } from '@wordpress/icons';
import {
	canRedoStroke,
	canUndoStroke,
	initialStrokeHistory,
	recordStroke,
	redoStroke,
	undoStroke,
} from './strokes';

function SketchHistoryButtons( { history, onUndo, onRedo } ) {
	return (
		<BlockControls group="block">
			<ToolbarGroup>
				<ToolbarButton
					icon={ undoIcon }
					label={ __( 'Undo stroke', 'q2' ) }
					shortcut="Ctrl+Z"
					disabled={ ! canUndoStroke( history ) }
					onClick={ onUndo }
				/>
				<ToolbarButton
					icon={ redoIcon }
					label={ __( 'Redo stroke', 'q2' ) }
					shortcut="Ctrl+Shift+Z"
					disabled={ ! canRedoStroke( history ) }
					onClick={ onRedo }
				/>
			</ToolbarGroup>
		</BlockControls>
	);
}

function withSketchHistory( BlockEdit ) {
	function SketchHistoryEdit( props ) {
		const { attributes, setAttributes } = props;
		const [ history, setHistory ] = useState( () =>
			initialStrokeHistory( attributes.strokes )
		);

		useEffect( () => {
			setHistory( ( current ) =>
				recordStroke( current, attributes.strokes )
			);
		}, [ attributes.strokes ] );

		if ( props.name !== 'a8c/sketch' ) {
			return <BlockEdit { ...props } />;
		}

		const apply = ( next ) => {
			if ( next === history ) {
				return;
			}
			setHistory( next );
			setAttributes( { strokes: next.present } );
		};

		return (
			<>
				<SketchHistoryButtons
					history={ history }
					onUndo={ () => apply( undoStroke( history ) ) }
					onRedo={ () => apply( redoStroke( history ) ) }
				/>
				<BlockEdit { ...props } />
			</>
		);
	}
	SketchHistoryEdit.displayName = 'SketchHistoryEdit';
	return SketchHistoryEdit;
}

addFilter( 'editor.BlockEdit', 'q2/sketch-history', withSketchHistory );
