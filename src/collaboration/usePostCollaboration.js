import apiFetch from '@wordpress/api-fetch';
import { useCallback, useEffect, useState } from '@wordpress/element';

export default function usePostCollaboration( postId ) {
	const [ state, setState ] = useState( {
		following: false,
		liked: false,
		likes: 0,
		read: false,
	} );
	const [ ready, setReady ] = useState( false );

	useEffect( () => {
		let active = true;
		apiFetch( { path: `/q2/v1/collaboration/posts/${ postId }` } )
			.then( ( result ) => {
				if ( active ) {
					setState( result );
					setReady( true );
				}
			} )
			.catch( () => setReady( true ) );
		return () => {
			active = false;
		};
	}, [ postId ] );

	const update = useCallback(
		async ( action, enabled = true ) => {
			const result = await apiFetch( {
				path: `/q2/v1/collaboration/posts/${ postId }`,
				method: 'POST',
				data: { action, enabled },
			} );
			setState( result );
			return result;
		},
		[ postId ]
	);

	return { state, ready, update };
}
