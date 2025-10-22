const { RuleTester } = require('eslint')
const { Linter } = require('eslint')
const linter = new Linter()
const rule = linter.getRules().get('no-self-assign')

const ruleTester = new RuleTester()

ruleTester.run('no-self-assign', rule, {
  valid: [
    { code: 'a = b' },
    { code: 'a = a + 1;' },
  ],
  invalid: [
    {
      code: 'a = a',
      errors: [{ message: "'a' is assigned to itself." }],
    },
    {
      code: '[a] = [a]',
      parserOptions: { ecmaVersion: 6 },
      errors: [{ message: "'a' is assigned to itself." }],
    },
  ],
})
