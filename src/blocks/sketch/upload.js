/**
 * WordPress dependencies
 */
import { store as blockEditorStore } from '@wordpress/block-editor';
import { select } from '@wordpress/data';
import { __ } from '@wordpress/i18n';

export default function uploadBlobToMediaLibrary(
	imageBlob,
	{
		title = __( 'Image generated via Sketch block', 'q2' ),
		caption = '',
		description = '',
	},
	fn
) {
	const { getSettings } = select( blockEditorStore );
	const mediaUpload = getSettings().mediaUpload;

	if ( ! imageBlob ) {
		return fn( __( 'No valid image', 'q2' ) );
	}

	const reader = new window.FileReader();
	reader.readAsDataURL( imageBlob );
	reader.onloadend = () => {
		mediaUpload( {
			additionalData: {
				title,
				caption,
				description,
			},
			allowedTypes: [ 'image' ],
			filesList: [ imageBlob ],
			onFileChange: ( images ) => {
				if ( ! images?.length ) {
					return;
				}

				const image = images[ 0 ];
				if ( ! image?.id ) {
					return;
				}
				fn( null, image );
			},
			onError: fn,
		} );
	};
}

export function svgDomToBlob( svgNode, fn ) {
	if ( ! svgNode ) {
		return;
	}

	// Get SVG Blob.
	svgNode.setAttribute(
		'viewBox',
		`0 0 ${ svgNode.getBoundingClientRect().width } ${
			svgNode.getBoundingClientRect().height
		}`
	);
	const svgString = new window.XMLSerializer().serializeToString( svgNode );
	const DOMURL = window.URL || window.webkitURL || window;
	const svgBlob = new Blob( [ svgString ], {
		type: 'image/svg+xml;charset=utf-8',
	} );

	// Start to convert SVG string to base64.
	const canvas = document.createElement( 'canvas' );
	const ctx = canvas.getContext( '2d' );
	ctx.canvas.width = svgNode.width.baseVal.value;
	ctx.canvas.height = svgNode.height.baseVal.value;

	// Create an image based on the SVG string.
	const img = new window.Image();
	const url = DOMURL.createObjectURL( svgBlob );
	img.onload = function () {
		// Draw the image on the canvas.
		ctx.drawImage( img, 0, 0 );
		DOMURL.revokeObjectURL( canvas.toDataURL( 'image/png' ) );
		canvas.toBlob( fn );
	};
	img.src = url;
}
