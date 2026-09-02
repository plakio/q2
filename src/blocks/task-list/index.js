/**
 * Block registration for q2/task-list.
 */
import { registerBlockType } from '@wordpress/blocks';
import { __ } from '@wordpress/i18n';
import Edit, { Save } from './edit';

registerBlockType( 'q2/task-list', {
	title: __( 'Task list', 'q2' ),
	description: __( 'Group related tasks and add them quickly.', 'q2' ),
	category: 'widgets',
	icon: 'yes-alt',
	keywords: [ 'tasks', 'todo', 'checklist' ],
	supports: { html: false, reusable: false },
	attributes: {
		title: { type: 'string', default: '' },
	},
	edit: Edit,
	save: Save,
} );
