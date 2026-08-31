/**
 * Block registration for q2/changelog.
 */
import { registerBlockType } from '@wordpress/blocks';
import { __ } from '@wordpress/i18n';
import Edit, { Save } from './edit';

registerBlockType( 'q2/changelog', {
	title: __( 'Changelog', 'q2' ),
	description: __( 'Append-only changelog entry list with dates.', 'q2' ),
	category: 'widgets',
	icon: 'admin-customizer',
	keywords: [ 'changelog', 'log', 'release' ],
	supports: { html: false, reusable: false },
	attributes: {
		entries: {
			type: 'array',
			default: [],
			items: {
				type: 'object',
			},
		},
	},
	edit: Edit,
	save: Save,
} );
