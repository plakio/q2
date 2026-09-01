/**
 * Q2 Task block — assigns + due date + status.
 */
import apiFetch from '@wordpress/api-fetch';
import { InnerBlocks, useBlockProps } from '@wordpress/block-editor';
import { SelectControl, TextControl } from '@wordpress/components';
import { useEffect, useId, useState } from '@wordpress/element';
import { __, _n, sprintf } from '@wordpress/i18n';

function generateBlockId() {
	if ( typeof window !== 'undefined' && window.crypto?.randomUUID ) {
		return window.crypto.randomUUID().replace( /-/g, '' ).slice( 0, 16 );
	}
	return (
		Date.now().toString( 36 ) + Math.random().toString( 36 ).slice( 2, 10 )
	);
}

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

export default function Edit( { attributes, setAttributes } ) {
	const {
		blockId,
		title,
		status = 'todo',
		dueDate,
		assignees = [],
	} = attributes;
	const blockProps = useBlockProps( { className: 'q2-task' } );
	const [ members, setMembers ] = useState( [] );
	const [ search, setSearch ] = useState( '' );
	const assigneeIdPrefix = useId();

	useEffect( () => {
		if ( ! blockId ) {
			setAttributes( { blockId: generateBlockId() } );
		}
	}, [ blockId, setAttributes ] );

	useEffect( () => {
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
	}, [ search ] );

	return (
		<div { ...blockProps }>
			<div className="q2-task-fields">
				<TextControl
					label={ __( 'Task title', 'q2' ) }
					value={ title }
					placeholder={ __( 'What needs to be done?', 'q2' ) }
					onChange={ ( next ) => setAttributes( { title: next } ) }
				/>
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
