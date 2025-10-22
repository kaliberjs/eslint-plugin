const { RuleTester } = require('eslint')
const { Linter } = require('eslint')
const linter = new Linter()
const rule = linter.getRules().get('no-unused-vars')

const ruleTester = new RuleTester()

ruleTester.run('no-unused-vars', rule, {
  valid: [
    { code: 'var a = 1; console.log(a);' },
  ],
  invalid: [
    {
      code: 'var a = 1;',
      errors: [{ message: "'a' is assigned a value but never used." }],
    },
    {
      code: 'var a = 1; var b = 2;',
      errors: [{ message: "'a' is assigned a value but never used." }, { message: "'b' is assigned a value but never used." }],
    },
    {
      code: 'var a = 1; var b = a;',
      errors: [{ message: "'b' is assigned a value but never used." }],
    },
  ],
})
