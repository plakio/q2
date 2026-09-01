export function serializedContentIsMeaningful( serialized ) {
	const readable = serialized
		.replace( /<!--[^]*?-->/g, '' )
		.replace( /<[^>]+>/g, '' )
		.replace( /&nbsp;|\s/g, '' );

	return (
		readable.length > 0 ||
		/<(?:img|audio|video|figure|a)\b/i.test( serialized ) ||
		/<!-- wp:q2\/(?:task|project-status|changelog|survey|files)\b/.test(
			serialized
		)
	);
}
