/**
 * Block registration for q2/task.
 *
 * @package
 */
import { registerBlockType } from '@wordpress/blocks';
import { __ } from '@wordpress/i18n';
import Edit, { LegacySave, Save } from './edit';

const attributes = {
	blockId: {
		type: 'string',
		source: 'attribute',
		attribute: 'data-block-id',
		selector: '.q2-task',
	},
	title: { type: 'string', default: '' },
	status: { type: 'string', default: 'todo' },
	dueDate: { type: 'string', default: '' },
	assignees: { type: 'array', default: [] },
};

registerBlockType( 'q2/task', {
	title: __( 'Task', 'q2' ),
	description: __( 'A trackable task with assignees and a due date.', 'q2' ),
	category: 'widgets',
	icon: 'list-view',
	keywords: [ 'task', 'todo', 'assignment' ],
	supports: { html: false, reusable: false },
	attributes,
	edit: Edit,
	save: Save,
	deprecated: [ { attributes, save: LegacySave } ],
} );
