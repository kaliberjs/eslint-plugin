const { RuleTester } = require('eslint')
const { Linter } = require('eslint')
const linter = new Linter()
const rule = linter.getRules().get('no-octal')

const ruleTester = new RuleTester()

ruleTester.run('no-octal', rule, {
  valid: [
    { code: 'var a = 123;' },
    { code: 'var a = "07";' },
    { code: '"use strict"; var a = 123;' },
  ],
  invalid: [
    {
      code: 'var a = 071;',
      errors: [{ message: "Octal literals should not be used." }],
    },
    {
      code: 'var a = 0123;',
      errors: [{ message: "Octal literals should not be used." }],
    },
  ],
})
