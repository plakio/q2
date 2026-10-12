/**
 * Q2 Sketch block — freehand drawing canvas.
 *
 * Forked from the Automattic block-experiments Sketch block
 * (GPL-2.0-or-later) so Q2 owns its defaults and roadmap: the default
 * brush is the thinnest preset, and saved content renders statically
 * without a server round-trip.
 */
import getStroke from 'perfect-freehand';

/**
 * Internal dependencies
 */
import { DEFAULT_PRESET, getSvgPathFromStroke, presets } from './lib';
import Controls from './controls';

/**
 * WordPress dependencies
 */
import { useCallback, useRef, useState } from '@wordpress/element';
import { useBlockProps } from '@wordpress/block-editor';
import { ResizableBox } from '@wordpress/components';

const MIN_HEIGHT = 1;
const MAX_HEIGHT = 1000;

export default function Edit( { attributes, isSelected, setAttributes } ) {
	const { strokes, height, title } = attributes;
	const [ currentMark, setCurrentMark ] = useState();
	const [ preset, setPreset ] = useState( DEFAULT_PRESET );
	const [ isResizing, setIsResizing ] = useState( false );
	const [ color, setColor ] = useState( '#000' );
	const ref = useRef( null );
	const blockProps = useBlockProps( {
		ref,
	} );
	const handlePointerDown = useCallback(
		( e ) => {
			const { left: x, top: y } = ref.current.getBoundingClientRect();
			if ( ! isSelected ) {
				return;
			}
			// Capture the pointer so the stroke keeps receiving moves even
			// when it crosses the resize handle or leaves the canvas, and
			// so releasing over those areas still commits the stroke.
			if ( typeof e.currentTarget.setPointerCapture === 'function' ) {
				try {
					e.currentTarget.setPointerCapture( e.pointerId );
				} catch {
					// Best-effort: drawing still works without capture.
				}
			}
			const mark = {
				type: e.pointerType,
				points: [ [ e.clientX - x, e.clientY - y, e.pressure ] ],
			};
			setCurrentMark( mark );
		},
		[ ref, isSelected, setCurrentMark ]
	);

	const handlePointerMove = useCallback(
		( e ) => {
			const { left: x, top: y } = ref.current.getBoundingClientRect();

			if ( isSelected && currentMark && e.buttons === 1 ) {
				const mark = {
					...currentMark,
					points: [
						...currentMark.points,
						[ e.clientX - x, e.clientY - y, e.pressure ],
					],
				};
				e.preventDefault();
				setCurrentMark( mark );
			}
		},
		[ ref, isSelected, currentMark, setCurrentMark ]
	);

	const handlePointerUp = useCallback( () => {
		if ( isSelected && currentMark ) {
			const stroke = getStroke( currentMark.points, {
				...presets[ preset ],
				simulatePressure: currentMark.type !== 'pen',
			} );
			setAttributes( {
				strokes: [
					...strokes,
					{
						stroke,
						color,
					},
				],
			} );
			setCurrentMark( undefined );
		}
	}, [
		isSelected,
		currentMark,
		setCurrentMark,
		setAttributes,
		strokes,
		preset,
		color,
	] );

	const clear = useCallback(
		() => setAttributes( { strokes: [] } ),
		[ setAttributes ]
	);

	const handleOnResizeStart = useCallback( () => {
		setIsResizing( true );
	}, [ setIsResizing ] );

	const setTitle = useCallback(
		( newTitle ) => setAttributes( { title: newTitle } ),
		[ setAttributes ]
	);

	const handleOnResizeStop = useCallback(
		( event, direction, elt, delta ) => {
			const sketchHeight = Math.min(
				parseInt( height + delta.height, 10 ),
				MAX_HEIGHT
			);
			setAttributes( {
				height: sketchHeight,
			} );
			setIsResizing( false );
		},
		[ height, setAttributes, setIsResizing ]
	);

	const currentStroke = currentMark && {
		stroke: getStroke( currentMark.points, {
			...presets[ preset ],
			simulatePressure: currentMark.type !== 'pen',
		} ),
		color,
	};

	return (
		<>
			<Controls
				clear={ clear }
				color={ color }
				setColor={ setColor }
				preset={ preset }
				setPreset={ setPreset }
				isEmpty={ ! strokes.length }
				title={ title }
				setTitle={ setTitle }
				blockRef={ ref }
				attributes={ attributes }
			/>
			<figure { ...blockProps }>
				<ResizableBox
					size={ {
						height,
					} }
					minHeight={ MIN_HEIGHT }
					enable={ {
						top: false,
						right: false,
						bottom: true,
						left: false,
						topRight: false,
						bottomRight: false,
						bottomLeft: false,
						topLeft: false,
					} }
					onResizeStart={ handleOnResizeStart }
					onResizeStop={ handleOnResizeStop }
					showHandle={ isSelected }
					__experimentalShowTooltip={ true }
					__experimentalTooltipProps={ {
						axis: 'y',
						position: 'bottom',
						isVisible: isResizing,
					} }
				>
					<Freehand
						handlePointerDown={ handlePointerDown }
						handlePointerMove={ handlePointerMove }
						handlePointerUp={ handlePointerUp }
						strokes={ strokes }
						currentStroke={ currentStroke }
						title={ title }
					/>
				</ResizableBox>
			</figure>
		</>
	);
}

export function Freehand( {
	currentStroke,
	strokes,
	handlePointerDown,
	handlePointerMove,
	handlePointerUp,
	title,
} ) {
	return (
		<svg
			onPointerDown={ handlePointerDown }
			onPointerMove={ handlePointerMove }
			onPointerUp={ handlePointerUp }
			style={ { touchAction: 'none' } }
			role="img"
		>
			{ title && <title>{ title }</title> }
			{ strokes.map( ( stroke, i ) => (
				<StrokePath key={ i } stroke={ stroke } />
			) ) }

			{ currentStroke && <StrokePath stroke={ currentStroke } /> }
		</svg>
	);
}

export function StrokePath( { stroke } ) {
	const color = stroke.color ?? '#f00';
	return <path fill={ color } d={ getSvgPathFromStroke( stroke.stroke ) } />;
}
