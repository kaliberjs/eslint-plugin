const { RuleTester } = require('eslint')
const { builtinRules } = require('eslint/use-at-your-own-risk')
const rule = builtinRules.get('no-self-compare')

const ruleTester = new RuleTester()

ruleTester.run('no-self-compare', rule, {
  valid: [
    { code: 'if (a === b) {}' },
    { code: 'if (a > b) {}' },
  ],
  invalid: [
    {
      code: 'if (a === a) {}',
      errors: [{ message: "Comparing to itself is potentially pointless." }],
    },
    {
      code: 'if (a > a) {}',
      errors: [{ message: "Comparing to itself is potentially pointless." }],
    },
  ],
})
