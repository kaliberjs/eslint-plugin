const { RuleTester } = require('eslint')
const { Linter } = require('eslint')
const linter = new Linter()
const rule = linter.getRules().get('no-with')

const ruleTester = new RuleTester()

ruleTester.run('no-with', rule, {
  valid: [
    { code: 'foo.bar = 1;' },
  ],
  invalid: [
    {
      code: 'with (foo) { bar = 1; }',
      errors: [{ message: "Unexpected use of 'with' statement." }],
    },
  ],
})
