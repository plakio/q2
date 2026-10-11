/**
 * Smoke tests for every native block allowed in Q2 editors.
 *
 * Each block is parsed and rendered inside the real BlockContentEditor.
 * A crash in any block's Edit surfaces as a console.error, which the
 * shared jest setup turns into a test failure.
 *
 * Note: blocks with nested inner-block editors (list, quote, details,
 * buttons) run into an async-act settling loop that also reproduces with
 * a bare core BlockEditorProvider and no Q2 code at all, i.e. a jsdom
 * environment artifact rather than a Q2 defect. Those render with a
 * synchronous act instead, which settles instantly.
 */
import { createBlock, parse, serialize } from '@wordpress/blocks';
import BlockContentEditor, { POST_BLOCKS } from './BlockContentEditor';
import '../blocks';
import '../mentions/register';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

jest.mock( '@wordpress/api-fetch', () => ( {
	__esModule: true,
	default: jest.fn( () => Promise.reject( new Error( 'offline' ) ) ),
} ) );

jest.mock(
	'uuid',
	() => ( {
		__esModule: true,
		default: {},
		v4: () => 'test-uuid-1234',
		v1: () => 'test-uuid-1',
	} ),
	{ virtual: true }
);

jest.mock(
	'marked',
	() => ( {
		__esModule: true,
		Marked: jest.fn(),
	} ),
	{ virtual: true }
);

jest.mock(
	'client-zip',
	() => ( {
		__esModule: true,
		downloadZip: jest.fn(),
	} ),
	{ virtual: true }
);

// Blocks whose nested editor never settles under async act in jsdom
// (also true without any Q2 code); render them with a synchronous act.
const SYNC_ACT_BLOCKS = new Set( [
	'core/list',
	'core/quote',
	'core/details',
	'core/buttons',
] );

const TOP_LEVEL_BLOCKS = POST_BLOCKS.filter(
	( name ) =>
		name.startsWith( 'core/' ) &&
		! [ 'core/list-item', 'core/column', 'core/button' ].includes( name )
);

const NESTED_CASES = [
	{
		label: 'columns with a column and paragraph',
		block: () =>
			createBlock( 'core/columns', {}, [
				createBlock( 'core/column', {}, [
					createBlock( 'core/paragraph', { content: 'hi' } ),
				] ),
			] ),
	},
	{
		label: 'buttons with a button',
		block: () =>
			createBlock( 'core/buttons', {}, [
				createBlock( 'core/button', { text: 'Click' } ),
			] ),
	},
	{
		label: 'list with list items',
		block: () =>
			createBlock( 'core/list', {}, [
				createBlock( 'core/list-item', { content: 'one' } ),
				createBlock( 'core/list-item', { content: 'two' } ),
			] ),
	},
	{
		label: 'gallery with an image',
		block: () =>
			createBlock( 'core/gallery', {}, [
				createBlock( 'core/image', {} ),
			] ),
	},
];

async function renderContent( content, sync = false ) {
	// eslint-disable-next-line import/no-extraneous-dependencies -- test renderer ships with @wordpress/element
	const { act } = require( 'react' );
	const { createRoot } = require( '@wordpress/element' );

	const container = document.createElement( 'div' );
	document.body.appendChild( container );
	const root = createRoot( container );
	const element = (
		<BlockContentEditor initialContent={ content } onSave={ () => {} } />
	);
	if ( sync ) {
		act( () => {
			root.render( element );
		} );
	} else {
		await act( async () => {
			root.render( element );
		} );
	}
	const rendered = container.querySelector(
		'.block-editor-block-list__block'
	);
	if ( sync ) {
		act( () => {
			root.unmount();
		} );
	} else {
		await act( async () => {
			root.unmount();
		} );
	}
	container.remove();
	return rendered;
}

describe( 'native blocks in Q2 editors', () => {
	it.each( TOP_LEVEL_BLOCKS )(
		'renders %s without crashing',
		async ( name ) => {
			const rendered = await renderContent(
				serialize( createBlock( name ) ),
				SYNC_ACT_BLOCKS.has( name )
			);
			expect( rendered ).not.toBeNull();
		}
	);

	it.each( NESTED_CASES )(
		'round-trips $label through serialization',
		( { block } ) => {
			// Nested pre-populated editors cannot render under jsdom:
			// the render never settles even with a bare core provider
			// and no Q2 code, so validate the serialize/parse round-trip
			// instead. (Top-level containers render above.)
			const parsed = parse( serialize( block() ) );
			expect( parsed ).toHaveLength( 1 );
			const names = [];
			const walk = ( list ) =>
				list.forEach( ( item ) => {
					names.push( item.name );
					expect( item.isValid ).not.toBe( false );
					walk( item.innerBlocks );
				} );
			walk( parsed );
			expect( names.length ).toBeGreaterThan( 1 );
		}
	);
} );
