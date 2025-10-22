const { RuleTester } = require('eslint')
const { Linter } = require('eslint')
const linter = new Linter()
const rule = linter.getRules().get('no-object-constructor')

const ruleTester = new RuleTester()

ruleTester.run('no-object-constructor', rule, {
  valid: [
    { code: 'var a = {};' },
    { code: 'var a = { a: 1 };' },
  ],
  invalid: [
    {
      code: 'var a = new Object();',
      errors: [{ message: "The object literal notation {} is preferable." }],
    },
    {
      code: 'var a = new Object({ a: 1 });',
      errors: [{ message: "The object literal notation {} is preferable." }],
    },
  ],
})
