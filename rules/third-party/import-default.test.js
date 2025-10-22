const { RuleTester } = require('eslint')
const rule = require('eslint-plugin-import').rules['default']

const ruleTester = new RuleTester({
  parserOptions: {
    ecmaVersion: 6,
    sourceType: 'module',
  }
})

ruleTester.run('import/default', rule, {
  valid: [
    `import a from './rules/third-party/mocks/export-default-a';`,
  ],
  invalid: [
    {
      code: `import a from './rules/third-party/mocks/export-a';`,
      errors: [{ message: 'No default export found in imported module "./rules/third-party/mocks/export-a".', type: 'ImportDefaultSpecifier' }],
    },
  ],
})
