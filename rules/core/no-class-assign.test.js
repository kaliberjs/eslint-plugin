const { RuleTester } = require('eslint')
const { builtinRules } = require('eslint/use-at-your-own-risk')
const rule = builtinRules.get('no-class-assign')

const ruleTester = new RuleTester({ languageOptions: { ecmaVersion: 2020, sourceType: 'module' } })

ruleTester.run('no-class-assign', rule, {
  valid: [
    'class A {}',
  ],
  invalid: [
    {
      code: 'class A {}; A = 1;',
      errors: [{ message: "'A' is a class." }],
    },
  ],
})
