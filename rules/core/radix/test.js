const { RuleTester } = require('eslint')
const { Linter } = require('eslint')
const linter = new Linter()
const rule = linter.getRules().get('radix')

const ruleTester = new RuleTester()

ruleTester.run('radix', rule, {
  valid: [
    { code: 'parseInt("10", 10)' },
    { code: 'parseInt(10, 10)' },
  ],
  invalid: [
    {
      code: 'parseInt("10")',
      errors: [{ message: "Missing radix parameter." }],
    },
  ],
})
