const { RuleTester } = require('eslint')
const { builtinRules } = require('eslint/use-at-your-own-risk')
const rule = builtinRules.get('no-ex-assign')

const ruleTester = new RuleTester({ languageOptions: { ecmaVersion: 2020, sourceType: 'module' } })

ruleTester.run('no-ex-assign', rule, {
  valid: [
    `try {} catch (e) {}`,
  ],
  invalid: [
    {
      code: `try {} catch (e) { e = 10; }`,
      errors: [{ message: "Do not assign to the exception parameter." }],
    },
  ],
})
