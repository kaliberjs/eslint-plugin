const { RuleTester } = require('eslint')
const { builtinRules } = require('eslint/use-at-your-own-risk')
const rule = builtinRules.get('no-unused-vars')

const ruleTester = new RuleTester()

ruleTester.run('no-unused-vars', rule, {
  valid: [
    { code: 'var a = 1; console.log(a);' },
  ],
  invalid: [
    {
      code: 'var a = 1;',
      errors: [{ message: "'a' is assigned a value but never used.", suggestions: 1 }],
    },
    {
      code: 'var a = 1; var b = 2;',
      errors: [{ message: "'a' is assigned a value but never used.", suggestions: 1 }, { message: "'b' is assigned a value but never used.", suggestions: 1 }],
    },
    {
      code: 'var a = 1; var b = a;',
      errors: [{ message: "'b' is assigned a value but never used.", suggestions: 1 }],
    },
  ],
})
