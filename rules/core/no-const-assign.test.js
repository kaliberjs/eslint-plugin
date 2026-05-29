const { RuleTester } = require('eslint')
const { builtinRules } = require('eslint/use-at-your-own-risk')
const rule = builtinRules.get('no-const-assign')

const ruleTester = new RuleTester({ languageOptions: { ecmaVersion: 2020, sourceType: 'module' } })

ruleTester.run('no-const-assign', rule, {
  valid: [
    'const a = 1;',
  ],
  invalid: [
    {
      code: 'const a = 1; a = 2;',
      errors: [{ message: "'a' is constant." }],
    },
  ],
})
