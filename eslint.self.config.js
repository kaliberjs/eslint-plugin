const stylistic = require('@stylistic/eslint-plugin')

module.exports = [
  {
    plugins: {
      '@stylistic': stylistic,
    },

    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'commonjs',
    },

    rules: {
      '@stylistic/semi': ['warn', 'never'],
      '@stylistic/quotes': ['warn', 'single', { avoidEscape: true, allowTemplateLiterals: true }],
      '@stylistic/comma-dangle': ['warn', 'only-multiline'],
      '@stylistic/eol-last': 'warn',
      '@stylistic/no-trailing-spaces': 'warn',
    },
  },
  {
    ignores: ['node_modules/**', 'rules/third-party/mocks/**'],
  },
]
