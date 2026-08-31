import apiFetch from '@wordpress/api-fetch';
import { useEffect, useState } from '@wordpress/element';
import { addFilter } from '@wordpress/hooks';
import { __ } from '@wordpress/i18n';

const memberCompleter = {
	name: 'q2-members',
	className: 'q2-autocompleters-member',
	triggerPrefix: '@',

	useItems( filterValue ) {
		const [ members, setMembers ] = useState( [] );
		useEffect( () => {
			let active = true;
			apiFetch( {
				path: `/q2/v1/people?search=${ encodeURIComponent(
					filterValue
				) }`,
			} )
				.then( ( result ) => active && setMembers( result ) )
				.catch( () => {} );
			return () => {
				active = false;
			};
		}, [ filterValue ] );

		const options = members.map( ( member ) => ( {
			key: `q2-member-${ member.id }`,
			value: member,
			label: (
				<span className="q2-mention-option">
					<img src={ member.avatarUrl } alt="" />
					<strong>{ member.name }</strong>
					<small>@{ member.slug }</small>
				</span>
			),
		} ) );
		if ( window.q2Settings?.capabilities?.mentionAll ) {
			options.unshift( {
				key: 'q2-member-all',
				value: { slug: 'all' },
				label: (
					<strong>
						{ __( 'Everyone in this workspace', 'q2' ) }
					</strong>
				),
			} );
		}
		return [ options ];
	},

	getOptionCompletion( member ) {
		return `@${ member.slug }`;
	},
};

addFilter(
	'editor.Autocomplete.completers',
	'q2/member-mentions',
	( completers ) => [
		...completers.filter( ( completer ) => completer.name !== 'users' ),
		memberCompleter,
	]
);
