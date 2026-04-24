const { RuleTester } = require('eslint')
const { builtinRules } = require('eslint/use-at-your-own-risk')
const rule = builtinRules.get('no-redeclare')

const ruleTester = new RuleTester({ languageOptions: { ecmaVersion: 2020, sourceType: 'script' } })

ruleTester.run('no-redeclare', rule, {
  valid: [
    { code: 'var a = 1; var b = 2;' },
    { code: 'var a = 1;', options: [{ builtinGlobals: false }] },
  ],
  invalid: [
    {
      code: 'var a = 1; var a = 2;',
      errors: [{ message: "'a' is already defined." }],
    },
    {
      code: 'var a = 1; var a = 2;',
      options: [{ builtinGlobals: true }],
      errors: [{ message: "'a' is already defined." }],
    },
    {
      code: 'var Object = 1;',
      options: [{ builtinGlobals: true }],
      errors: [{ message: "'Object' is already defined as a built-in global variable." }],
    },
  ],
})
