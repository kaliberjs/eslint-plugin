const { RuleTester } = require('eslint')
const rule = require('eslint-plugin-import').rules['no-amd']

const ruleTester = new RuleTester({
  parserOptions: {
    ecmaVersion: 6,
    sourceType: 'module',
  }
})

ruleTester.run('import/no-amd', rule, {
  valid: [
    `import { a } from 'a';`,
    `require('a')`,
    `define('a')`,
  ],
  invalid: [
    {
      code: `define(['a'], function (a) {})`,
      errors: [{ message: 'Expected imports instead of AMD define().', type: 'CallExpression' }],
    },
    {
      code: `require(['a'], function (a) {})`,
      errors: [{ message: 'Expected imports instead of AMD require().', type: 'CallExpression' }],
    },
  ],
})
