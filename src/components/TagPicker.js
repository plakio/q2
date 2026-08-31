import apiFetch from '@wordpress/api-fetch';
import { useEffect, useId, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

export default function TagPicker( { value, onChange } ) {
	const controlId = useId();
	const [ tags, setTags ] = useState( [] );

	useEffect( () => {
		let active = true;
		apiFetch( { path: '/wp/v2/tags?per_page=100&hide_empty=false' } )
			.then( ( result ) => active && setTags( result ) )
			.catch( () => {} );
		return () => {
			active = false;
		};
	}, [] );

	if ( tags.length === 0 ) {
		return null;
	}

	return (
		<label className="q2-tag-picker" htmlFor={ controlId }>
			<span>{ __( 'Tags', 'q2' ) }</span>
			<select
				id={ controlId }
				multiple
				value={ value.map( String ) }
				onChange={ ( event ) =>
					onChange(
						Array.from( event.target.selectedOptions, ( option ) =>
							Number( option.value )
						)
					)
				}
			>
				{ tags.map( ( tag ) => (
					<option key={ tag.id } value={ tag.id }>
						{ tag.name }
					</option>
				) ) }
			</select>
		</label>
	);
}
