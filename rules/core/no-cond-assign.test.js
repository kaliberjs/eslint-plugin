const { RuleTester } = require('eslint')
const { builtinRules } = require('eslint/use-at-your-own-risk')
const rule = builtinRules.get('no-cond-assign')

const ruleTester = new RuleTester({ languageOptions: { ecmaVersion: 2020, sourceType: 'module' } })

ruleTester.run('no-cond-assign', rule, {
  valid: [
    `if (x === 0) {}`,
  ],
  invalid: [
    {
      code: `if (x = 0) {}`,
      errors: [{ message: "Expected a conditional expression and instead saw an assignment." }],
    },
  ],
})
