const { RuleTester } = require('eslint')
const { builtinRules } = require('eslint/use-at-your-own-risk')
const rule = builtinRules.get('no-duplicate-case')

const ruleTester = new RuleTester({ languageOptions: { ecmaVersion: 2020, sourceType: 'module' } })

ruleTester.run('no-duplicate-case', rule, {
  valid: [
    "switch (a) { case 1: break; case 2: break; }",
  ],
  invalid: [
    {
      code: "switch (a) { case 1: break; case 1: break; }",
      errors: [{ message: 'Duplicate case label.' }],
    },
  ],
})
