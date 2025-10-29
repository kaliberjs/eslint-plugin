const { RuleTester } = require('eslint')
const { Linter } = require('eslint')
const linter = new Linter()
const rule = linter.getRules().get('no-regex-spaces')

const ruleTester = new RuleTester()

ruleTester.run('no-regex-spaces', rule, {
  valid: [
    { code: 'var re = /foo bar/;' },
    { code: 'var re = /foo {2}bar/;' },
  ],
  invalid: [
    {
      code: 'var re = /foo  bar/;',
      output: 'var re = /foo {2}bar/;',
      errors: [{ message: "Spaces are hard to count. Use {2}." }],
    },
    {
      code: 'var re = /foo   bar/;',
      output: 'var re = /foo {3}bar/;',
      errors: [{ message: "Spaces are hard to count. Use {3}." }],
    },
  ],
})
