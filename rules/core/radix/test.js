const { RuleTester } = require('eslint')
const { builtinRules } = require('eslint/use-at-your-own-risk')
const rule = builtinRules.get('radix')

const ruleTester = new RuleTester()

ruleTester.run('radix', rule, {
  valid: [
    { code: 'parseInt("10", 10)' },
    { code: 'parseInt(10, 10)' },
  ],
  invalid: [
    {
      code: 'parseInt("10")',
      errors: [{ message: "Missing radix parameter.", suggestions: 1 }],
    },
  ],
})
