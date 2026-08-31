export default function StateMessage( { children } ) {
	return (
		<div className="q2-state" role="status">
			{ children }
		</div>
	);
}
