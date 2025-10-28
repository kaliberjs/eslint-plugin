const { RuleTester } = require('eslint')
const { Linter } = require('eslint')
const linter = new Linter()
const rule = linter.getRules().get('no-undef')

const ruleTester = new RuleTester()

ruleTester.run('no-undef', rule, {
  valid: [
    { code: 'var a = 1; a = 2;' },
    { code: '/*global b*/ b = 1;' },
  ],
  invalid: [
    {
      code: 'a = 1;',
      errors: [{ message: "'a' is not defined." }],
    },
    {
      code: 'var a = b;',
      errors: [{ message: "'b' is not defined." }],
    },
  ],
})
