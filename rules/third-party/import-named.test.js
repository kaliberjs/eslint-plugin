const { RuleTester } = require('eslint')
const rule = require('eslint-plugin-import').rules['named']

const ruleTester = new RuleTester({
  parserOptions: {
    ecmaVersion: 6,
    sourceType: 'module',
  }
})

ruleTester.run('import/named', rule, {
  valid: [
    `import { a } from './rules/third-party/mocks/export-a';`,
  ],
  invalid: [
    {
      code: `import { b } from './rules/third-party/mocks/export-a';`,
      errors: [{ message: `b not found in './rules/third-party/mocks/export-a'`, type: 'Identifier' }],
    },
  ],
})
