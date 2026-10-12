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
import { useSketchEraser } from './eraser';

function SketchHistoryButtons( {
	history,
	erasing,
	onUndo,
	onRedo,
	onToggleEraser,
} ) {
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
				<ToolbarButton
					icon={ <EraserIcon /> }
					label={ __( 'Eraser', 'q2' ) }
					isPressed={ erasing }
					onClick={ onToggleEraser }
				/>
			</ToolbarGroup>
		</BlockControls>
	);
}

function EraserIcon() {
	return (
		<svg viewBox="0 0 24 24" aria-hidden="true">
			<path d="M14.5 3l6.5 6.5-9.5 9.5H5v-6.5L14.5 3z" />
		</svg>
	);
}

function withSketchHistory( BlockEdit ) {
	function SketchHistoryEdit( props ) {
		const { attributes, setAttributes } = props;
		const [ history, setHistory ] = useState( () =>
			initialStrokeHistory( attributes.strokes )
		);
		const [ erasing, setErasing ] = useState( false );

		useEffect( () => {
			setHistory( ( current ) =>
				recordStroke( current, attributes.strokes )
			);
		}, [ attributes.strokes ] );

		useSketchEraser( {
			strokes: attributes.strokes,
			setAttributes,
			erasing,
		} );

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
					erasing={ erasing }
					onUndo={ () => apply( undoStroke( history ) ) }
					onRedo={ () => apply( redoStroke( history ) ) }
					onToggleEraser={ () => setErasing( ( value ) => ! value ) }
				/>
				<BlockEdit { ...props } />
			</>
		);
	}
	SketchHistoryEdit.displayName = 'SketchHistoryEdit';
	return SketchHistoryEdit;
}

addFilter( 'editor.BlockEdit', 'q2/sketch-history', withSketchHistory );
