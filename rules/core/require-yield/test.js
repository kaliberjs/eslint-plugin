const { RuleTester } = require('eslint')
const { Linter } = require('eslint')
const linter = new Linter()
const rule = linter.getRules().get('require-yield')

const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 6 } })

ruleTester.run('require-yield', rule, {
  valid: [
    { code: 'function* foo() { yield 1; }' },
  ],
  invalid: [
    {
      code: 'function* foo() { return 1; }',
      errors: [{ message: "This generator function does not have 'yield'." }],
    },
  ],
})
