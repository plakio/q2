import { registerBlockType } from '@wordpress/blocks';
import { __ } from '@wordpress/i18n';
import Edit, { Save } from './edit';

registerBlockType( 'q2/survey', {
	title: __( 'Survey', 'q2' ),
	description: __(
		'Ask one question and collect a vote from each teammate.',
		'q2'
	),
	category: 'widgets',
	icon: 'chart-bar',
	keywords: [ 'survey', 'poll', 'vote' ],
	supports: { html: false, reusable: false },
	attributes: {
		surveyId: {
			type: 'string',
			source: 'attribute',
			attribute: 'data-survey-id',
			selector: '.q2-survey',
		},
		question: { type: 'string', default: '' },
		options: {
			type: 'array',
			default: [ '', '', '' ],
			items: { type: 'string' },
		},
	},
	edit: Edit,
	save: Save,
} );
