/**
 * Q2 Task block — assigns + due date + status.
 */
import apiFetch from '@wordpress/api-fetch';
import {
	InnerBlocks,
	RichText,
	store as blockEditorStore,
	useBlockProps,
} from '@wordpress/block-editor';
import { Button, SelectControl, TextControl } from '@wordpress/components';
import { useSelect } from '@wordpress/data';
import { useEffect, useId, useState } from '@wordpress/element';
import { __, _n, sprintf } from '@wordpress/i18n';
import { chevronDown, chevronUp } from '@wordpress/icons';
import { generateTaskId } from './id';

function AssigneeSelector( { members, value, onChange, idPrefix } ) {
	const toggle = ( id ) => {
		const next = value.includes( id )
			? value.filter( ( item ) => item !== id )
			: [ ...value, id ];
		onChange( next );
	};
	return (
		<div className="q2-task-assignees">
			{ members.length === 0 && (
				<p>{ __( 'Loading members…', 'q2' ) }</p>
			) }
			{ members.map( ( member ) => {
				const inputId = `${ idPrefix }-${ member.id }`;
				return (
					<div key={ member.id } className="q2-task-assignee-row">
						<input
							id={ inputId }
							type="checkbox"
							checked={ value.includes( member.id ) }
							onChange={ () => toggle( member.id ) }
						/>
						<label htmlFor={ inputId }>
							<strong>{ member.name }</strong>
							<small aria-hidden="true">@{ member.slug }</small>
						</label>
					</div>
				);
			} ) }
		</div>
	);
}

export default function Edit( { attributes, setAttributes, clientId } ) {
	const {
		blockId,
		title,
		status = 'todo',
		dueDate,
		assignees = [],
	} = attributes;
	const blockProps = useBlockProps( {
		className: 'q2-task q2-task-row',
		'data-status': status,
	} );
	const [ members, setMembers ] = useState( [] );
	const [ search, setSearch ] = useState( '' );
	const [ expanded, setExpanded ] = useState( false );
	const assigneeIdPrefix = useId();
	const hasEarlierDuplicate = useSelect(
		( select ) => {
			if ( ! blockId ) {
				return false;
			}
			const editor = select( blockEditorStore );
			const blockIds = editor.getClientIdsWithDescendants();
			const index = blockIds.indexOf( clientId );
			return blockIds.slice( 0, index ).some( ( siblingId ) => {
				return (
					editor.getBlockAttributes( siblingId )?.blockId === blockId
				);
			} );
		},
		[ blockId, clientId ]
	);

	useEffect( () => {
		if ( ! blockId ) {
			setAttributes( { blockId: generateTaskId() } );
		}
	}, [ blockId, setAttributes ] );

	useEffect( () => {
		if ( hasEarlierDuplicate ) {
			setAttributes( {
				blockId: generateTaskId(),
				status: 'todo',
				dueDate: '',
				assignees: [],
			} );
		}
	}, [ hasEarlierDuplicate, setAttributes ] );

	useEffect( () => {
		if ( ! expanded ) {
			return undefined;
		}
		let active = true;
		apiFetch( {
			path: `/q2/v1/people?search=${ encodeURIComponent( search ) }`,
		} )
			.then( ( result ) => {
				if ( active ) {
					setMembers( result.slice( 0, 20 ) );
				}
			} )
			.catch( () => {} );
		return () => {
			active = false;
		};
	}, [ expanded, search ] );

	return (
		<div { ...blockProps }>
			<div className="q2-task-main">
				<input
					className="q2-task-check"
					type="checkbox"
					checked={ status === 'done' }
					aria-label={
						status === 'done'
							? __( 'Mark task as active', 'q2' )
							: __( 'Mark task as done', 'q2' )
					}
					onChange={ ( event ) =>
						setAttributes( {
							status: event.target.checked ? 'done' : 'todo',
						} )
					}
				/>
				<RichText
					identifier="title"
					tagName="p"
					className="q2-task-title"
					value={ title }
					placeholder={ __( 'Add a task…', 'q2' ) }
					allowedFormats={ [] }
					onChange={ ( next ) => setAttributes( { title: next } ) }
				/>
				<Button
					className="q2-task-options-toggle"
					icon={ expanded ? chevronUp : chevronDown }
					label={
						expanded
							? __( 'Hide task options', 'q2' )
							: __( 'Show task options', 'q2' )
					}
					onClick={ () => setExpanded( ! expanded ) }
				/>
			</div>
			{ expanded && (
				<div className="q2-task-fields">
					<div className="q2-task-fields-row">
						<SelectControl
							label={ __( 'Status', 'q2' ) }
							value={ status }
							options={ [
								{ label: __( 'To do', 'q2' ), value: 'todo' },
								{
									label: __( 'In progress', 'q2' ),
									value: 'in_progress',
								},
								{ label: __( 'Done', 'q2' ), value: 'done' },
							] }
							onChange={ ( next ) =>
								setAttributes( { status: next } )
							}
						/>
						<TextControl
							label={ __( 'Due date', 'q2' ) }
							type="date"
							value={ dueDate || '' }
							onChange={ ( next ) =>
								setAttributes( { dueDate: next || '' } )
							}
						/>
					</div>
					<details className="q2-task-assignee-picker">
						<summary>
							{ assignees.length > 0
								? sprintf(
										/* translators: %d: number of assignees. */
										_n(
											'%d assignee',
											'%d assignees',
											assignees.length,
											'q2'
										),
										assignees.length
								  )
								: __( 'Add assignees', 'q2' ) }
						</summary>
						<div className="q2-task-assignee-picker-content">
							<TextControl
								label={ __( 'Search people', 'q2' ) }
								value={ search }
								onChange={ setSearch }
							/>
							<AssigneeSelector
								members={ members }
								value={ assignees }
								idPrefix={ assigneeIdPrefix }
								onChange={ ( next ) =>
									setAttributes( { assignees: next } )
								}
							/>
						</div>
					</details>
				</div>
			) }
			{ expanded && (
				<div className="q2-task-detail">
					<p className="q2-task-detail-label">
						{ __( 'Details', 'q2' ) }
					</p>
					<InnerBlocks
						allowedBlocks={ [ 'core/paragraph' ] }
						template={ [ [ 'core/paragraph' ] ] }
						templateLock={ false }
					/>
				</div>
			) }
		</div>
	);
}

export function Save( { attributes } ) {
	const {
		blockId,
		title = '',
		status = 'todo',
		dueDate,
		assignees = [],
	} = attributes;
	return (
		<div
			className="q2-task q2-task-row"
			data-block-id={ blockId || '' }
			data-status={ status }
			data-due-date={ dueDate || '' }
			data-assignees={ assignees.join( ',' ) }
		>
			<div className="q2-task-main">
				<button
					type="button"
					className="q2-task-check"
					role="checkbox"
					aria-checked={ status === 'done' }
					aria-label={
						status === 'done'
							? __( 'Mark task as active', 'q2' )
							: __( 'Mark task as done', 'q2' )
					}
					data-q2-task-toggle="true"
				/>
				<p className="q2-task-title">
					{ title }
					{ dueDate && (
						<>
							{ ' · ' }
							{ sprintf(
								/* translators: %s: due date. */
								__( 'due %s', 'q2' ),
								dueDate
							) }
						</>
					) }
				</p>
			</div>
			<div className="q2-task-detail">
				<InnerBlocks.Content />
			</div>
		</div>
	);
}

export function LegacySave( { attributes } ) {
	const {
		blockId,
		title = '',
		status = 'todo',
		dueDate,
		assignees = [],
	} = attributes;
	return (
		<div
			className="q2-task"
			data-block-id={ blockId || '' }
			data-status={ status }
			data-due-date={ dueDate || '' }
			data-assignees={ assignees.join( ',' ) }
		>
			<p>
				<strong>{ __( 'Task:', 'q2' ) }</strong> { title }
				{ dueDate && (
					<>
						{ ' · ' }
						{ sprintf(
							/* translators: %s: due date. */
							__( 'due %s', 'q2' ),
							dueDate
						) }
					</>
				) }
			</p>
			<InnerBlocks.Content />
		</div>
	);
}
