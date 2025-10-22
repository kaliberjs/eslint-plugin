const { RuleTester } = require('eslint')
const { Linter } = require('eslint')
const linter = new Linter()
const rule = linter.getRules().get('no-unsafe-negation')

const ruleTester = new RuleTester()

ruleTester.run('no-unsafe-negation', rule, {
  valid: [
    { code: 'a in b' },
    { code: 'a instanceof b' },
    { code: '!(a in b)' },
    { code: '!(a instanceof b)' },
  ],
  invalid: [
    {
      code: '!a in b',
      errors: [{ message: "Unexpected negating the left operand of 'in' operator." }],
    },
    {
      code: '!a instanceof b',
      errors: [{ message: "Unexpected negating the left operand of 'instanceof' operator." }],
    },
  ],
})
