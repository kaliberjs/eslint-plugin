const { RuleTester } = require('eslint')
const { Linter } = require('eslint')
const linter = new Linter()
const rule = linter.getRules().get('no-whitespace-before-property')

const ruleTester = new RuleTester()

ruleTester.run('no-whitespace-before-property', rule, {
  valid: [
    { code: 'foo.bar' },
    { code: 'foo[bar]' },
  ],
  invalid: [
    {
      code: 'foo. bar',
      output: 'foo.bar',
      errors: [{ message: "Unexpected whitespace before property bar." }],
    },
    {
      code: 'foo [bar]',
      output: 'foo[bar]',
      errors: [{ message: "Unexpected whitespace before property bar." }],
    },
  ],
})
