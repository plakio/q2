/**
 * Regression tests for the @-mention autocompleter.
 *
 * The options array returned by useItems must keep a stable reference
 * across renders: AutocompleterUI dispatches it into state from a layout
 * effect keyed on its identity, so a fresh array every render loops into
 * "Maximum update depth exceeded" and crashes the edited block.
 */
import { applyFilters } from '@wordpress/hooks';
import apiFetch from '@wordpress/api-fetch';
import './register';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

jest.mock( '@wordpress/api-fetch', () => ( {
	__esModule: true,
	default: jest.fn(),
} ) );

const MEMBERS = [
	{
		id: 2,
		name: 'Oscar Paz',
		slug: 'oscar',
		avatarUrl: 'https://example.test/avatar.jpg',
		roles: [ 'editor' ],
	},
];

function completer() {
	const completers = applyFilters( 'editor.Autocomplete.completers', [] );
	return completers.find( ( item ) => item.name === 'q2-members' );
}

describe( 'member mentions completer', () => {
	beforeEach( () => {
		apiFetch.mockReset();
		apiFetch.mockResolvedValue( MEMBERS );
		window.q2Settings = { capabilities: { mentionAll: true } };
	} );

	afterEach( () => {
		delete window.q2Settings;
	} );

	it( 'registers the q2-members completer instead of core users', () => {
		const found = completer();
		expect( found ).toBeDefined();
		expect( found.triggerPrefix ).toBe( '@' );
	} );

	it( 'returns a stable options reference across re-renders', async () => {
		// eslint-disable-next-line import/no-extraneous-dependencies -- test renderer ships with @wordpress/element
		const { act } = require( 'react' );
		const { createRoot } = require( '@wordpress/element' );

		const seen = [];
		function Harness( { filterValue } ) {
			const [ items ] = completer().useItems( filterValue );
			seen.push( items );
			return null;
		}

		const container = document.createElement( 'div' );
		document.body.appendChild( container );
		const root = createRoot( container );
		await act( async () => {
			root.render( <Harness filterValue="" /> );
		} );
		await act( async () => {
			root.render( <Harness filterValue="" /> );
		} );
		await act( async () => {
			root.unmount();
		} );
		container.remove();

		expect( seen.length ).toBeGreaterThanOrEqual( 2 );
		const last = seen[ seen.length - 1 ];
		const previous = seen[ seen.length - 2 ];
		expect( last ).toBe( previous );
		expect( last.length ).toBe( MEMBERS.length + 1 );
	} );

	it( 'completes a member selection as plain-text mention', () => {
		expect( completer().getOptionCompletion( MEMBERS[ 0 ] ) ).toBe(
			'@oscar'
		);
		expect( completer().getOptionCompletion( { slug: 'all' } ) ).toBe(
			'@all'
		);
	} );
} );
