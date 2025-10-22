const { RuleTester } = require('eslint')
const { Linter } = require('eslint')
const linter = new Linter()
const rule = linter.getRules().get('no-self-compare')

const ruleTester = new RuleTester()

ruleTester.run('no-self-compare', rule, {
  valid: [
    { code: 'if (a === b) {}' },
    { code: 'if (a > b) {}' },
  ],
  invalid: [
    {
      code: 'if (a === a) {}',
      errors: [{ message: "Comparing to itself is potentially pointless." }],
    },
    {
      code: 'if (a > a) {}',
      errors: [{ message: "Comparing to itself is potentially pointless." }],
    },
  ],
})
