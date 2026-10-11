/**
 * Jest setup: polyfill Web APIs missing from the jsdom environment that
 * newer @wordpress/* builds expect at import time.
 */
const { TextDecoder, TextEncoder } = require( 'util' );

if ( typeof globalThis.TextEncoder === 'undefined' ) {
	globalThis.TextEncoder = TextEncoder;
}

if ( typeof globalThis.TextDecoder === 'undefined' ) {
	globalThis.TextDecoder = TextDecoder;
}

// jsdom has no ResizeObserver; several core blocks (table, media, …)
// observe their placeholder size. A no-op stub keeps them renderable.
if ( typeof globalThis.ResizeObserver === 'undefined' ) {
	globalThis.ResizeObserver = class {
		observe() {}
		unobserve() {}
		disconnect() {}
	};
}

if ( typeof globalThis.IntersectionObserver === 'undefined' ) {
	globalThis.IntersectionObserver = class {
		observe() {}
		unobserve() {}
		disconnect() {}
	};
}
