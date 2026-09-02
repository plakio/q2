/**
 * Q2 Task List block -- a lightweight container with quick task creation.
 */
import {
	InnerBlocks,
	RichText,
	useBlockProps,
	useInnerBlocksProps,
} from '@wordpress/block-editor';
import { __ } from '@wordpress/i18n';

const ALLOWED_BLOCKS = [ 'q2/task' ];
const DEFAULT_BLOCK = { name: 'q2/task' };

export default function Edit( { attributes, setAttributes } ) {
	const { title = '' } = attributes;
	const blockProps = useBlockProps( { className: 'q2-task-list' } );
	const innerBlocksProps = useInnerBlocksProps(
		{ className: 'q2-task-list-items' },
		{
			allowedBlocks: ALLOWED_BLOCKS,
			defaultBlock: DEFAULT_BLOCK,
			directInsert: true,
			templateLock: false,
			renderAppender: false,
		}
	);

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
