/**
 * Q2 Changelog block — append-only version log.
 */
import { InnerBlocks, useBlockProps } from '@wordpress/block-editor';
import { Button, TextareaControl, TextControl } from '@wordpress/components';
import { useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { plus } from '@wordpress/icons';

function Entry( { entry, onUpdate, onRemove } ) {
	const update = ( patch ) => onUpdate( { ...entry, ...patch } );
	return (
		<li className="q2-changelog-entry">
			<TextControl
				type="date"
				value={ entry.date }
				onChange={ ( v ) => update( { date: v } ) }
			/>
			<TextControl
				placeholder={ __( 'Heading', 'q2' ) }
				value={ entry.heading }
				onChange={ ( v ) => update( { heading: v } ) }
			/>
			<TextareaControl
				placeholder={ __( 'Summary', 'q2' ) }
				value={ entry.description }
				onChange={ ( v ) => update( { description: v } ) }
			/>
			<Button
				variant="tertiary"
				onClick={ onRemove }
				aria-label={ __( 'Remove entry', 'q2' ) }
			>
				{ __( 'Remove', 'q2' ) }
			</Button>
		</li>
	);
}

export default function Edit( { attributes, setAttributes } ) {
	const { entries = [] } = attributes;
	const blockProps = useBlockProps( { className: 'q2-changelog' } );
	const [ note, setNote ] = useState( '' );

	const addEntry = () => {
		const heading = note.trim();
		if ( '' === heading ) {
			return;
		}
		setAttributes( {
			entries: [
				...( entries || [] ),
				{
					date: new Date().toISOString().slice( 0, 10 ),
					heading,
					description: '',
				},
			],
		} );
		setNote( '' );
	};

	const updateEntry = ( index, next ) => {
		const nextEntries = [ ...entries ];
		nextEntries[ index ] = next;
		setAttributes( { entries: nextEntries } );
	};

	const removeEntry = ( index ) => {
		setAttributes( {
			entries: entries.filter( ( _, i ) => i !== index ),
		} );
	};

	return (
		<div { ...blockProps }>
			<header className="q2-changelog-header">
				<h3>{ __( 'Changelog', 'q2' ) }</h3>
				<p className="q2-changelog-hint">
					{ __(
						'Record every important change to this project. Entries appear in chronological order.',
						'q2'
					) }
				</p>
			</header>
			<ol className="q2-changelog-list">
				{ entries
					.slice()
					.reverse()
					.map( ( entry, idx ) => {
						const realIndex = entries.length - 1 - idx;
						return (
							<Entry
								key={ `${ entry.date }-${ realIndex }` }
								entry={ entry }
								onUpdate={ ( next ) =>
									updateEntry( realIndex, next )
								}
								onRemove={ () => removeEntry( realIndex ) }
							/>
						);
					} ) }
			</ol>
			<div className="q2-changelog-form">
				<TextControl
					placeholder={ __( 'What changed?', 'q2' ) }
					value={ note }
					onChange={ setNote }
				/>
				<Button
					icon={ plus }
					variant="primary"
					onClick={ addEntry }
					disabled={ '' === note.trim() }
				>
					{ __( 'Add entry', 'q2' ) }
				</Button>
			</div>
			<InnerBlocks allowedBlocks={ [ 'core/paragraph' ] } />
		</div>
	);
}

export function Save( { attributes } ) {
	const { entries = [] } = attributes;
	return (
		<div className="q2-changelog" data-entries={ entries.length }>
			<h3>{ __( 'Changelog', 'q2' ) }</h3>
			<ol>
				{ entries
					.slice()
					.reverse()
					.map( ( entry, idx ) => (
						<li key={ idx } data-date={ entry.date }>
							<time dateTime={ entry.date }>{ entry.date }</time>
							<strong>{ entry.heading }</strong>
							{ entry.description && (
								<p>{ entry.description }</p>
							) }
						</li>
					) ) }
			</ol>
			<InnerBlocks.Content />
		</div>
	);
}
