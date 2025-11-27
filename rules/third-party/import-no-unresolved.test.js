const { RuleTester } = require('eslint')
const rule = require('eslint-plugin-import').rules['no-unresolved']

const ruleTester = new RuleTester({
  parserOptions: {
    ecmaVersion: 6,
    sourceType: 'module',
  }
})

ruleTester.run('import/no-unresolved', rule, {
  valid: [
    `import a from './rules/third-party/mocks/export-default-a';`,
  ],
  invalid: [
    {
      code: `import a from './rules/third-party/mocks/non-existent';`,
      errors: [{ message: `Unable to resolve path to module './rules/third-party/mocks/non-existent'.`, type: 'Literal' }],
    },
  ],
})
