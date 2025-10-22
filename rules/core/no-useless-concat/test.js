const { RuleTester } = require('eslint')
const { Linter } = require('eslint')
const linter = new Linter()
const rule = linter.getRules().get('no-useless-concat')

const ruleTester = new RuleTester()

ruleTester.run('no-useless-concat', rule, {
  valid: [
    { code: 'var a = "a" + b;' },
    { code: 'var a = a + "b";' },
  ],
  invalid: [
    {
      code: 'var a = "a" + "b";',
      errors: [{ message: "Unexpected string concatenation of literals." }],
    },
  ],
})
