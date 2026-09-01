import { registerBlockType } from '@wordpress/blocks';
import { __ } from '@wordpress/i18n';
import Edit, { Save } from './edit';

registerBlockType( 'q2/files', {
	title: __( 'Files', 'q2' ),
	description: __( 'Share a tidy list of downloadable files.', 'q2' ),
	category: 'media',
	icon: 'media-document',
	keywords: [ 'files', 'documents', 'downloads' ],
	supports: { html: false, reusable: false },
	attributes: {
		heading: { type: 'string', default: '' },
		files: { type: 'array', default: [], items: { type: 'object' } },
	},
	edit: Edit,
	save: Save,
} );
