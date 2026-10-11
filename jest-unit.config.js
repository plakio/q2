/**
 * Project Jest configuration for unit tests.
 *
 * Extends the default @wordpress/scripts unit config with two fixes the
 * dependency tree needs under Jest:
 *
 * - Nested ESM-only dependencies (notably @wordpress/theme, shipped
 *   without a CommonJS build, and parsel-js) are transpiled instead of
 *   crashing the suite.
 * - Every bare @wordpress/* import resolves to the single top-level
 *   build copy. Without this, nested duplicates (e.g. the block-editor
 *   nested under block-library) create a second data registry and block
 *   registration breaks.
 */
const path = require( 'path' );
const base = require( '@wordpress/scripts/config/jest-unit.config.js' );

module.exports = {
	...base,
	transform: {
		...( base.transform || {} ),
		'^.+\\.m?[jt]sx?$': path.join(
			__dirname,
			'node_modules/@wordpress/scripts/config/babel-transform'
		),
	},
	transformIgnorePatterns: [
		'/node_modules/(?!.*(@wordpress/theme|parsel-js)/)',
	],
	moduleNameMapper: {
		'\\.(scss|css)$':
			'<rootDir>/node_modules/@wordpress/jest-preset-default/scripts/style-mock.js',
		'^@wordpress/((?!theme$)[a-z0-9-]+)$':
			'<rootDir>/node_modules/@wordpress/$1/build/index.cjs',
	},
	setupFiles: [
		'<rootDir>/node_modules/@wordpress/jest-preset-default/scripts/setup-globals.js',
		'<rootDir>/test/support/jest-setup.js',
	],
};
