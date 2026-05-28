const { RuleTester } = require('eslint')
const { builtinRules } = require('eslint/use-at-your-own-risk')
const rule = builtinRules.get('no-sparse-arrays')

const ruleTester = new RuleTester()

ruleTester.run('no-sparse-arrays', rule, {
  valid: [
    { code: '[1, 2, 3]' },
    { code: '[1, 2, 3, ]' },
  ],
  invalid: [
    {
      code: '[1, , 3]',
      errors: [{ message: 'Unexpected comma in middle of array.' }],
    },
  ],
})
