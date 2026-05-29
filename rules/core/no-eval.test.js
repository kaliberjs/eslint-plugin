const { RuleTester } = require('eslint')
const { builtinRules } = require('eslint/use-at-your-own-risk')
const rule = builtinRules.get('no-eval')

const ruleTester = new RuleTester({ languageOptions: { ecmaVersion: 2020, sourceType: 'module' } })

ruleTester.run('no-eval', rule, {
  valid: [
    `parseInt("10")`,
  ],
  invalid: [
    {
      code: `eval("10")`,
      errors: [{ message: '`eval` can be harmful.' }],
    },
  ],
})
