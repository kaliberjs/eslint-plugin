const { RuleTester } = require('eslint')
const { builtinRules } = require('eslint/use-at-your-own-risk')
const rule = builtinRules.get('no-octal')

const ruleTester = new RuleTester({ languageOptions: { sourceType: 'script' } })

ruleTester.run('no-octal', rule, {
  valid: [
    { code: 'var a = 123;' },
    { code: 'var a = "07";' },
    { code: '"use strict"; var a = 123;' },
  ],
  invalid: [
    {
      code: 'var a = 071;',
      errors: [{ message: 'Octal literals should not be used.' }],
    },
    {
      code: 'var a = 0123;',
      errors: [{ message: 'Octal literals should not be used.' }],
    },
  ],
})
