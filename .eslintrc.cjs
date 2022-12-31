// eslint-disable-next-line no-undef
module.exports = {
	env: {
		browser: true,
		es2021: true,
	},
	extends: [
		'eslint:recommended',
		'plugin:@typescript-eslint/recommended',
	],
	overrides: [],
	parser: '@typescript-eslint/parser',
	parserOptions: {
		ecmaVersion: 'latest',
		sourceType: 'module',
	},
	plugins: ['@typescript-eslint', 'import'],
	rules: {
		indent: ['error', 'tab'],
		'linebreak-style': ['error', 'unix'],
		quotes: ['error', 'single'],
		semi: ['error', 'always'],
		'comma-dangle': [
			'error',
			{
				arrays: 'always-multiline',
				objects: 'always-multiline',
				imports: 'always-multiline',
				exports: 'always-multiline',
				functions: 'always-multiline',
			},
		],
		'no-multiple-empty-lines': ['error', { max: 1, maxEOF: 1, maxBOF: 0 } ],
		'eol-last': ['error', 'always'],
		'max-len': ['error', { code: 120, tabWidth: 2 }],
		'@typescript-eslint/no-empty-interface':  ['off'],
		'import/order': [
			'error',
			{
				'groups': [
					'builtin',
					'external',
					'internal',
					'sibling',
					'parent',
					'index',
					'object',
					'type',
				],
			},
		],
	},
};
