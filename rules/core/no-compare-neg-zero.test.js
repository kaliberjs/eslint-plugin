const { RuleTester } = require('eslint')
const { builtinRules } = require('eslint/use-at-your-own-risk')
const rule = builtinRules.get('no-compare-neg-zero')

const ruleTester = new RuleTester({ languageOptions: { ecmaVersion: 2020, sourceType: 'module' } })

ruleTester.run('no-compare-neg-zero', rule, {
  valid: [
    "x > 0",
  ],
  invalid: [
    {
      code: "x === -0",
      errors: [{ message: "Do not use the '===' operator to compare against -0." }],
    },
  ],
})
