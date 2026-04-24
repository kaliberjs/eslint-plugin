const { RuleTester } = require('eslint')
const { builtinRules } = require('eslint/use-at-your-own-risk')
const rule = builtinRules.get('no-unused-labels')

const ruleTester = new RuleTester()

ruleTester.run('no-unused-labels', rule, {
  valid: [
    { code: 'A: { break A; }' },
  ],
  invalid: [
    {
      code: 'A: var a = 1;',
      output: 'var a = 1;',
      errors: [{ message: "'A:' is defined but never used." }],
    },
    {
      code: 'A: var a = 1; console.log(a);',
      output: 'var a = 1; console.log(a);',
      errors: [{ message: "'A:' is defined but never used." }],
    },
  ],
})
