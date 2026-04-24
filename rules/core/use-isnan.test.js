const { RuleTester } = require('eslint')

const { builtinRules } = require('eslint/use-at-your-own-risk')
const rule = builtinRules.get('use-isnan')

const ruleTester = new RuleTester()

ruleTester.run('use-isnan', rule, {
  valid: [
    'isNaN(foo)',
    'isNaN(NaN)',
    'Number.isNaN(foo)',
    'Number.isNaN(NaN)',
    'foo()',
    'var foo = isNaN(NaN)',
    'var foo = Number.isNaN(NaN)',
  ],
  invalid: [
    {
      code: 'foo == NaN',
      errors: [{ messageId: "comparisonWithNaN", suggestions: 2 }],
    },
    {
      code: 'foo != NaN',
      errors: [{ messageId: "comparisonWithNaN", suggestions: 2 }],
    },
    {
      code: 'foo === NaN',
      errors: [{ messageId: "comparisonWithNaN", suggestions: 1 }],
    },
    {
      code: 'foo !== NaN',
      errors: [{ messageId: "comparisonWithNaN", suggestions: 1 }],
    },
  ],
})
