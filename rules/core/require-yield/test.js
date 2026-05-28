const { RuleTester } = require('eslint')
const { builtinRules } = require('eslint/use-at-your-own-risk')
const rule = builtinRules.get('require-yield')

const ruleTester = new RuleTester({ languageOptions: { ecmaVersion: 2020 } })

ruleTester.run('require-yield', rule, {
  valid: [
    { code: 'function* foo() { yield 1; }' },
  ],
  invalid: [
    {
      code: 'function* foo() { return 1; }',
      errors: [{ message: "This generator function does not have 'yield'." }],
    },
  ],
})
