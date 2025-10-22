const { RuleTester } = require('eslint')
const { Linter } = require('eslint')
const linter = new Linter()
const rule = linter.getRules().get('no-restricted-globals')

const ruleTester = new RuleTester()

ruleTester.run('no-restricted-globals', rule, {
  globals: {
    bar: 'readonly',
  },
  valid: [
    { code: 'foo()', options: ['bar'] },
    { code: 'var foo = 1;', options: ['bar'] },
  ],
  invalid: [
    {
      code: 'bar()',
      options: ['bar'],
      errors: [{ message: "Unexpected use of 'bar'." }],
    },
    {
      code: 'var bar = 1;',
      options: ['bar'],
      errors: [{ message: "Unexpected use of 'bar'." }],
    },
  ],
})
