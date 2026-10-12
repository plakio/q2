/**
 * WordPress dependencies
 */
import {
	BlockControls,
	InspectorControls,
	useSetting,
} from '@wordpress/block-editor';
import { useDispatch } from '@wordpress/data';
import {
	ColorPalette,
	Icon,
	PanelBody,
	TextareaControl,
	ToolbarButton,
	ToolbarDropdownMenu,
} from '@wordpress/components';
import { useCallback } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { trash, upload } from '@wordpress/icons';
import { store as noticesStore } from '@wordpress/notices';

/**
 * Internal dependencies
 */
import uploadBlobToMediaLibrary, { svgDomToBlob } from './upload';
import { BrushSizeControlIcon, BrushSizeIcon, ColorControlIcon } from './icons';

const brushes = [
	{
		value: 0,
		icon: <Icon icon={ <BrushSizeIcon radius="2" /> } type="svg" />,
	},
	{
		value: 1,
		icon: <Icon icon={ <BrushSizeIcon radius="4" /> } type="svg" />,
	},
	{
		value: 2,
		icon: <Icon icon={ <BrushSizeIcon radius="7" /> } type="svg" />,
	},
];

const Controls = ( {
	clear,
	color,
	setColor,
	preset,
	setPreset,
	isEmpty,
	title,
	setTitle,
	blockRef,
	attributes,
} ) => {
	const themePalette = useSetting( 'color.palette.theme' ) || [];
	const defaultPalette = useSetting( 'color.palette.default' ) || [];
	const userPalette = useSetting( 'color.palette.custom' ) || [];
	const colors = [
		themePalette.length
			? { name: __( 'Theme', 'q2' ), colors: themePalette }
			: null,
		defaultPalette.length
			? { name: __( 'Default', 'q2' ), colors: defaultPalette }
			: null,
		userPalette.length
			? { name: __( 'Custom', 'q2' ), colors: userPalette }
			: null,
	].filter( Boolean );
	const { createErrorNotice, createInfoNotice } = useDispatch( noticesStore );
	const uploadImage = useCallback( () => {
		const svgNode = blockRef.current?.querySelector( 'svg' );
		svgDomToBlob( svgNode, function ( blob ) {
			uploadBlobToMediaLibrary(
				blob,
				{ description: attributes?.title },
				function ( err, image ) {
					if ( err ) {
						return createErrorNotice( err );
					}

					createInfoNotice(
						__( 'Image created and added to the library', 'q2' ),
						{
							id: `uploaded-image-${ image.id }`,
							type: 'snackbar',
							isDismissible: false,
							actions: [
								{
									url: `/wp-admin/upload.php?item=${ image.id }`,
									label: __( 'View Image', 'q2' ),
								},
							],
						}
					);
				}
			);
		} );
	}, [ attributes, createErrorNotice, createInfoNotice, blockRef ] );
	return (
		<>
			<BlockControls group="block">
				<ToolbarDropdownMenu
					isCollapsed
					popoverProps={ {
						className: 'wp-block-q2-sketch__brush-style-popover',
						isAlternate: true,
					} }
					icon={ <Icon icon={ BrushSizeControlIcon } /> }
					label={ __( 'Brush', 'q2' ) }
					controls={ brushes.map( ( control ) => ( {
						...control,
						isActive: control.value === preset,
						onClick: () => {
							if ( control.value !== preset ) {
								setPreset( control.value );
							}
						},
					} ) ) }
				/>
				<ToolbarDropdownMenu
					isCollapsed
					popoverProps={ {
						className: 'wp-block-q2-sketch__color-palette-popover',
						variant: 'toolbar',
					} }
					icon={
						<Icon icon={ <ColorControlIcon color={ color } /> } />
					}
					label={ __( 'Color', 'q2' ) }
				>
					{ () => (
						<ColorPalette
							clearable={ false }
							colors={ colors }
							value={ color }
							disableCustomColors={ true }
							headingLevel="2"
							onChange={ setColor }
							__experimentalHasMultipleOrigins={ true }
						/>
					) }
				</ToolbarDropdownMenu>
				<ToolbarButton
					icon={ trash }
					onClick={ clear }
					label={ __( 'Clear canvas', 'q2' ) }
					disabled={ isEmpty }
				/>
			</BlockControls>

			<BlockControls group="other">
				<ToolbarButton
					icon={ upload }
					disabled={ isEmpty }
					onClick={ uploadImage }
					label={ __( 'Upload as image', 'q2' ) }
				/>
			</BlockControls>
			<InspectorControls>
				<PanelBody>
					<TextareaControl
						label={ __( 'Alt text (alternative text)', 'q2' ) }
						value={ title }
						onChange={ setTitle }
						help={
							<>
								{ __(
									"Add a short-text description so it's recognized as the accessible name for the sketch.",
									'q2'
								) }
							</>
						}
					/>
				</PanelBody>
			</InspectorControls>
		</>
	);
};

export default Controls;
