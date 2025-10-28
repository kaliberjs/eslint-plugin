const { RuleTester } = require('eslint')
const { Linter } = require('eslint')
const linter = new Linter()
const rule = linter.getRules().get('no-new-func')

const ruleTester = new RuleTester()

ruleTester.run('no-new-func', rule, {
  valid: [
    { code: 'var a = function() {};' },
  ],
  invalid: [
    {
      code: 'var a = new Function("a", "b", "return a + b");',
      errors: [{ message: "The Function constructor is eval." }],
    },
    {
      code: 'var a = Function("a", "b", "return a + b");',
      errors: [{ message: "The Function constructor is eval." }],
    },
  ],
})
