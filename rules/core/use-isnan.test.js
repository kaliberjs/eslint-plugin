const { Linter } = require('eslint')
const { RuleTester } = require('eslint')

const linter = new Linter()
const rule = linter.getRules().get('use-isnan')

const ruleTester = new RuleTester()

ruleTester.run('use-isnan', rule, {
  valid: [
    'isNaN(foo)',
    'isNaN(NaN)',
    'Number.isNaN(foo)',
    'Number.isNaN(NaN)',
    'foo()',
    'var foo = isNaN(NaN)',
    'var foo = Number.isNaN(NaN)',
  ],
  invalid: [
    {
      code: 'foo == NaN',
      errors: [{ message: "Use the isNaN function to compare with NaN." }],
    },
    {
      code: 'foo != NaN',
      errors: [{ message: "Use the isNaN function to compare with NaN." }],
    },
    {
      code: 'foo === NaN',
      errors: [{ message: "Use the isNaN function to compare with NaN." }],
    },
    {
      code: 'foo !== NaN',
      errors: [{ message: "Use the isNaN function to compare with NaN." }],
    },
  ],
})
