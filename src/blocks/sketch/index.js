/**
 * Block registration for q2/sketch.
 *
 * Q2 fork of the Automattic block-experiments Sketch block
 * (GPL-2.0-or-later): same stroke data model so existing drawings
 * migrate with a block transform, but owned defaults and roadmap.
 */
import { createBlock, registerBlockType } from '@wordpress/blocks';
import { __, _x } from '@wordpress/i18n';
import Edit from './edit';
import Save from './save';
import { BlockIcon as icon } from './icons';

registerBlockType( 'q2/sketch', {
	title: __( 'Sketch', 'q2' ),
	description: _x(
		'Draw and write freely on a canvas.',
		'Block description',
		'q2'
	),
	category: 'widgets',
	icon,
	keywords: [ __( 'Draw', 'q2' ) ],
	supports: { html: false, reusable: false, align: true },
	apiVersion: 2,
	attributes: {
		strokes: { type: 'array', default: [] },
		height: { type: 'number', default: 450 },
		title: { type: 'string', default: '' },
	},
	transforms: {
		from: [
			{
				type: 'block',
				blocks: [ 'a8c/sketch' ],
				transform: ( attributes ) =>
					createBlock( 'q2/sketch', {
						strokes: attributes.strokes || [],
						height: attributes.height || 450,
						title: attributes.title || '',
					} ),
			},
		],
	},
	edit: Edit,
	save: Save,
} );
