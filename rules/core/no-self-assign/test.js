const { RuleTester } = require('eslint')
const { builtinRules } = require('eslint/use-at-your-own-risk')
const rule = builtinRules.get('no-self-assign')

const ruleTester = new RuleTester()

ruleTester.run('no-self-assign', rule, {
  valid: [
    { code: 'a = b' },
    { code: 'a = a + 1;' },
  ],
  invalid: [
    {
      code: 'a = a',
      errors: [{ message: "'a' is assigned to itself." }],
    },
    {
      code: '[a] = [a]',
      languageOptions: { ecmaVersion: 2020 },
      errors: [{ message: "'a' is assigned to itself." }],
    },
  ],
})
