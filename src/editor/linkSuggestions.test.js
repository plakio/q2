import apiFetch from '@wordpress/api-fetch';
import { fetchLinkSuggestions } from './linkSuggestions';

jest.mock( '@wordpress/api-fetch', () => ( {
	__esModule: true,
	default: jest.fn(),
} ) );

describe( 'fetchLinkSuggestions', () => {
	beforeEach( () => {
		apiFetch.mockReset();
		window.q2Settings = {
			appUrl: 'https://example.test/q2/',
			homeUrl: 'https://example.test/',
		};
	} );

	afterEach( () => {
		delete window.q2Settings;
	} );

	it( 'maps posts and pages into link suggestions', async () => {
		apiFetch.mockResolvedValue( [
			{
				id: 1,
				url: 'https://example.test/hello/',
				title: 'Hello &amp; welcome',
				subtype: 'post',
				type: 'post',
			},
			{
				id: 2,
				url: 'https://example.test/about/',
				title: 'About',
				subtype: 'page',
				type: 'post',
			},
		] );

		const results = await fetchLinkSuggestions( 'hel' );

		expect( apiFetch ).toHaveBeenCalledWith( {
			path: expect.stringContaining( 'subtype=post%2Cpage' ),
		} );
		expect( results ).toEqual( [
			{
				id: 1,
				url: 'https://example.test/q2/feed/hello/',
				title: 'Hello & welcome',
				type: 'post',
				kind: 'post-type',
			},
			{
				id: 2,
				url: 'https://example.test/q2/pages/about/',
				title: 'About',
				type: 'page',
				kind: 'post-type',
			},
		] );
	} );

	it( 'drops results without a url or id', async () => {
		apiFetch.mockResolvedValue( [
			{ id: 0, url: '', title: 'Nope' },
			{ id: 3, url: 'https://example.test/ok/', title: '' },
		] );

		const results = await fetchLinkSuggestions( 'x' );

		expect( results ).toEqual( [
			{
				id: 3,
				url: 'https://example.test/q2/feed/ok/',
				title: '(no title)',
				kind: 'post-type',
			},
		] );
	} );

	it( 'returns an empty list when the request fails', async () => {
		apiFetch.mockRejectedValue( new Error( 'request failed' ) );

		await expect( fetchLinkSuggestions( 'x' ) ).resolves.toEqual( [] );
	} );
} );
