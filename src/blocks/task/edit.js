/**
 * Q2 Task block — assigns + due date + status.
 */
import apiFetch from '@wordpress/api-fetch';
import {
	InnerBlocks,
	InspectorControls,
	useBlockProps,
} from '@wordpress/block-editor';
import { PanelBody, SelectControl, TextControl } from '@wordpress/components';
import { useEffect, useMemo, useState } from '@wordpress/element';
import { __, _n, sprintf } from '@wordpress/i18n';

function generateBlockId() {
	if ( typeof window !== 'undefined' && window.crypto?.randomUUID ) {
		return window.crypto.randomUUID().replace( /-/g, '' ).slice( 0, 16 );
	}
	return (
		Date.now().toString( 36 ) + Math.random().toString( 36 ).slice( 2, 10 )
	);
}

function AssigneeSelector( { members, value, onChange } ) {
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
				const inputId = `q2-task-assignee-${ member.id }`;
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

	const statusLabel = useMemo(
		() =>
			( {
				todo: __( 'To do', 'q2' ),
				in_progress: __( 'In progress', 'q2' ),
				done: __( 'Done', 'q2' ),
			} )[ status ] || __( 'To do', 'q2' ),
		[ status ]
	);

	return (
		<>
			<InspectorControls>
				<PanelBody title={ __( 'Task', 'q2' ) }>
					<TextControl
						label={ __( 'Title', 'q2' ) }
						value={ title }
						onChange={ ( next ) =>
							setAttributes( { title: next } )
						}
					/>
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
						type="date"
						label={ __( 'Due date', 'q2' ) }
						value={ dueDate || '' }
						onChange={ ( next ) =>
							setAttributes( { dueDate: next || '' } )
						}
					/>
				</PanelBody>
				<PanelBody
					title={ __( 'Assignees', 'q2' ) }
					initialOpen={ false }
				>
					<TextControl
						label={ __( 'Search people', 'q2' ) }
						value={ search }
						onChange={ setSearch }
					/>
					<AssigneeSelector
						members={ members }
						value={ assignees }
						onChange={ ( next ) =>
							setAttributes( { assignees: next } )
						}
					/>
				</PanelBody>
			</InspectorControls>
			<div { ...blockProps }>
				<div className="q2-task-summary">
					<span className={ `q2-task-status is-${ status }` }>
						{ statusLabel }
					</span>
					<strong>{ title || __( 'Untitled task', 'q2' ) }</strong>
					{ dueDate && (
						<span className="q2-task-due">
							{ sprintf(
								/* translators: %s: due date (ISO). */
								__( 'Due %s', 'q2' ),
								dueDate
							) }
						</span>
					) }
					{ assignees.length > 0 && (
						<span className="q2-task-assigned">
							{ sprintf(
								/* translators: %d: number of assignees. */
								_n(
									'%d assignee',
									'%d assignees',
									assignees.length,
									'q2'
								),
								assignees.length
							) }
						</span>
					) }
				</div>
				<div className="q2-task-detail">
					<InnerBlocks allowedBlocks={ [ 'core/paragraph' ] } />
				</div>
			</div>
		</>
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
