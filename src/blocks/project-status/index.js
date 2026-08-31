/**
 * Block registration for q2/project-status.
 */
import { registerBlockType } from '@wordpress/blocks';
import { __ } from '@wordpress/i18n';
import Edit, { Save } from './edit';

registerBlockType( 'q2/project-status', {
	title: __( 'Project Status', 'q2' ),
	description: __( 'A live summary of the Task blocks in this post.', 'q2' ),
	category: 'widgets',
	icon: 'chart-bar',
	keywords: [ 'project', 'tasks', 'progress' ],
	supports: { html: false, reusable: false },
	providesContext: { postId: 'postId' },
	attributes: {
		postId: { type: 'number', default: 0 },
	},
	edit: Edit,
	save: Save,
} );
