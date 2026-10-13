/**
 * Tests for @-mention highlighting in rendered content.
 */
import { highlightMentions } from './highlight';

const slugs = new Set( [ 'daniela', 'oscar' ] );

describe( 'highlightMentions', () => {
	it( 'wraps a member mention in a pill', () => {
		expect(
			highlightMentions( '<p>Hola @daniela, revisa esto</p>', slugs )
		).toBe(
			'<p>Hola <span class="q2-mention">@daniela</span>, revisa esto</p>'
		);
	} );

	it( 'paints @all without needing a member', () => {
		expect( highlightMentions( '<p>@all atentos</p>', slugs ) ).toBe(
			'<p><span class="q2-mention">@all</span> atentos</p>'
		);
	} );

	it( 'matches members case-insensitively', () => {
		expect( highlightMentions( '<p>@Daniela ven</p>', slugs ) ).toBe(
			'<p><span class="q2-mention">@daniela</span> ven</p>'
		);
	} );

	it( 'leaves unknown handles and emails alone', () => {
		const html = '<p>@desconocido escribe a ana@example.com, @oscar sí</p>';
		expect( highlightMentions( html, slugs ) ).toBe(
			'<p>@desconocido escribe a ana@example.com, <span class="q2-mention">@oscar</span> sí</p>'
		);
	} );

	it( 'keeps trailing punctuation outside the pill', () => {
		expect( highlightMentions( '<p>gracias @oscar.</p>', slugs ) ).toBe(
			'<p>gracias <span class="q2-mention">@oscar</span>.</p>'
		);
	} );

	it( 'skips links and code blocks', () => {
		expect(
			highlightMentions(
				'<p><a href="https://example.com">@daniela</a> y <code>@oscar</code></p>',
				slugs
			)
		).toBe(
			'<p><a href="https://example.com">@daniela</a> y <code>@oscar</code></p>'
		);
	} );

	it( 'paints several mentions in one node', () => {
		expect(
			highlightMentions( '<p>@daniela y @oscar, vengan</p>', slugs )
		).toBe(
			'<p><span class="q2-mention">@daniela</span> y <span class="q2-mention">@oscar</span>, vengan</p>'
		);
	} );

	it( 'returns the input untouched without slugs', () => {
		const html = '<p>Hola @daniela</p>';
		expect( highlightMentions( html, new Set() ) ).toBe( html );
		expect( highlightMentions( html, null ) ).toBe( html );
		expect( highlightMentions( '', slugs ) ).toBe( '' );
	} );
} );
