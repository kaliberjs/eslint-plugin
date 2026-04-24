const { RuleTester } = require('eslint')
const { builtinRules } = require('eslint/use-at-your-own-risk')
const rule = builtinRules.get('no-whitespace-before-property')

const ruleTester = new RuleTester()

ruleTester.run('no-whitespace-before-property', rule, {
  valid: [
    { code: 'foo.bar' },
    { code: 'foo[bar]' },
  ],
  invalid: [
    {
      code: 'foo. bar',
      output: 'foo.bar',
      errors: [{ message: "Unexpected whitespace before property bar." }],
    },
    {
      code: 'foo [bar]',
      output: 'foo[bar]',
      errors: [{ message: "Unexpected whitespace before property bar." }],
    },
  ],
})
