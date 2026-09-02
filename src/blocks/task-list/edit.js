/**
 * Q2 Task List block -- a lightweight container with quick task creation.
 */
import {
	InnerBlocks,
	RichText,
	useBlockProps,
	useInnerBlocksProps,
} from '@wordpress/block-editor';
import { createBlock } from '@wordpress/blocks';
import { Button } from '@wordpress/components';
import { useDispatch } from '@wordpress/data';
import { useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { plus } from '@wordpress/icons';
import { generateTaskId } from '../task/id';

const ALLOWED_BLOCKS = [ 'q2/task' ];

export default function Edit( { attributes, setAttributes, clientId } ) {
	const { title = '' } = attributes;
	const [ draft, setDraft ] = useState( '' );
	const { insertBlocks } = useDispatch( 'core/block-editor' );
	const blockProps = useBlockProps( { className: 'q2-task-list' } );
	const innerBlocksProps = useInnerBlocksProps(
		{ className: 'q2-task-list-items' },
		{
			allowedBlocks: ALLOWED_BLOCKS,
			templateLock: false,
			renderAppender: false,
		}
	);

	const addTask = () => {
		const taskTitle = draft.trim();
		if ( ! taskTitle ) {
			return;
		}

		insertBlocks(
			createBlock( 'q2/task', {
				blockId: generateTaskId(),
				title: taskTitle,
				status: 'todo',
			} ),
			undefined,
			clientId
		);
		setDraft( '' );
	};

	return (
		<section { ...blockProps }>
			<RichText
				tagName="h3"
				className="q2-task-list-title"
				value={ title }
				placeholder={ __( 'List name…', 'q2' ) }
				allowedFormats={ [] }
				onChange={ ( next ) => setAttributes( { title: next } ) }
			/>
			<div { ...innerBlocksProps } />
			<div className="q2-task-list-add">
				<input
					type="text"
					value={ draft }
					placeholder={ __( 'Add a task…', 'q2' ) }
					aria-label={ __( 'New task title', 'q2' ) }
					onChange={ ( event ) => setDraft( event.target.value ) }
					onKeyDown={ ( event ) => {
						if ( event.key === 'Enter' ) {
							event.preventDefault();
							addTask();
						}
					} }
				/>
				<Button
					icon={ plus }
					variant="tertiary"
					onClick={ addTask }
					disabled={ ! draft.trim() }
				>
					{ __( 'Add task', 'q2' ) }
				</Button>
			</div>
		</section>
	);
}

export function Save( { attributes } ) {
	const { title = '' } = attributes;

	return (
		<section className="q2-task-list">
			{ title && (
				<RichText.Content
					tagName="h3"
					className="q2-task-list-title"
					value={ title }
				/>
			) }
			<div className="q2-task-list-items">
				<InnerBlocks.Content />
			</div>
		</section>
	);
}
