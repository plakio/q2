import { serializedContentIsMeaningful } from './content';

describe( 'serializedContentIsMeaningful', () => {
	it( 'keeps the publish action disabled for an empty paragraph', () => {
		expect(
			serializedContentIsMeaningful(
				'<!-- wp:paragraph --><p></p><!-- /wp:paragraph -->'
			)
		).toBe( false );
	} );

	it( 'enables the publish action once text is entered', () => {
		expect(
			serializedContentIsMeaningful(
				'<!-- wp:paragraph --><p>A useful update</p><!-- /wp:paragraph -->'
			)
		).toBe( true );
	} );
} );
