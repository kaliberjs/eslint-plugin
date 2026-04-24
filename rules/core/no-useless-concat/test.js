const { RuleTester } = require('eslint')
const { builtinRules } = require('eslint/use-at-your-own-risk')
const rule = builtinRules.get('no-useless-concat')

const ruleTester = new RuleTester()

ruleTester.run('no-useless-concat', rule, {
  valid: [
    { code: 'var a = "a" + b;' },
    { code: 'var a = a + "b";' },
  ],
  invalid: [
    {
      code: 'var a = "a" + "b";',
      errors: [{ message: 'Unexpected string concatenation of literals.' }],
    },
  ],
})
