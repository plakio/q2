import { MediaUpload, useBlockProps } from '@wordpress/block-editor';
import { Button, TextControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { Icon, download, file, plus, trash } from '@wordpress/icons';

function normalizeMedia( item ) {
	return {
		id: item.id,
		title: item.title || item.filename || __( 'File', 'q2' ),
		url: item.url,
		filename: item.filename || '',
	};
}

export default function Edit( { attributes, setAttributes } ) {
	const { heading = '', files = [] } = attributes;
	const blockProps = useBlockProps( { className: 'q2-files' } );
	const updateFile = ( index, patch ) => {
		const next = [ ...files ];
		next[ index ] = { ...next[ index ], ...patch };
		setAttributes( { files: next } );
	};

	return (
		<div { ...blockProps }>
			<TextControl
				label={ __( 'Files heading', 'q2' ) }
				value={ heading }
				placeholder={ __( 'Here are all the files', 'q2' ) }
				onChange={ ( value ) => setAttributes( { heading: value } ) }
			/>
			<ul className="q2-files-list">
				{ files.map( ( item, index ) => (
					<li key={ `${ item.id }-${ index }` }>
						<Button
							icon={ file }
							label={ __( 'File', 'q2' ) }
							disabled
						/>
						<TextControl
							value={ item.title }
							onChange={ ( value ) =>
								updateFile( index, { title: value } )
							}
						/>
						<Button
							icon={ trash }
							label={ __( 'Remove file', 'q2' ) }
							onClick={ () =>
								setAttributes( {
									files: files.filter(
										( _, i ) => i !== index
									),
								} )
							}
						/>
					</li>
				) ) }
			</ul>
			<MediaUpload
				multiple
				onSelect={ ( selection ) => {
					const items = Array.isArray( selection )
						? selection
						: [ selection ];
					setAttributes( {
						files: [ ...files, ...items.map( normalizeMedia ) ],
					} );
				} }
				render={ ( { open } ) => (
					<Button icon={ plus } variant="secondary" onClick={ open }>
						{ __( 'Add files', 'q2' ) }
					</Button>
				) }
			/>
		</div>
	);
}

export function Save( { attributes } ) {
	const { heading = '', files = [] } = attributes;
	return (
		<div className="q2-files">
			{ heading && <h3>{ heading }</h3> }
			<ul className="q2-files-list">
				{ files.map( ( item, index ) => (
					<li key={ `${ item.id }-${ index }` }>
						<Icon icon={ file } size={ 18 } />
						<a href={ item.url } download>
							{ item.title ||
								item.filename ||
								__( 'File', 'q2' ) }
						</a>
						<a
							className="q2-files-download"
							href={ item.url }
							download
						>
							<Icon icon={ download } size={ 17 } />
							{ __( 'Download', 'q2' ) }
						</a>
					</li>
				) ) }
			</ul>
			{ files.length === 0 && (
				<p>{ __( 'No files added yet.', 'q2' ) }</p>
			) }
		</div>
	);
}
