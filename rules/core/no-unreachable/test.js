const { RuleTester } = require('eslint')
const { Linter } = require('eslint')
const linter = new Linter()
const rule = linter.getRules().get('no-unreachable')

const ruleTester = new RuleTester()

ruleTester.run('no-unreachable', rule, {
  valid: [
    { code: 'function foo() { return 1; }' },
    { code: 'function foo() { if (true) { return 1; } else { return 2; } }' },
  ],
  invalid: [
    {
      code: 'function foo() { return 1; var a = 1; }',
      errors: [{ message: "Unreachable code." }],
    },
    {
      code: 'function foo() { throw new Error(); var a = 1; }',
      errors: [{ message: "Unreachable code." }],
    },
  ],
})
