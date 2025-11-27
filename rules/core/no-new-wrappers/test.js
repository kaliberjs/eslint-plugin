const { RuleTester } = require('eslint')
const { Linter } = require('eslint')
const linter = new Linter()
const rule = linter.getRules().get('no-new-wrappers')

const ruleTester = new RuleTester()

ruleTester.run('no-new-wrappers', rule, {
  valid: [
    { code: 'var a = new Object();' },
    { code: 'var a = String("a");' },
    { code: 'var a = Number("1");' },
    { code: 'var a = Boolean("true");' },
  ],
  invalid: [
    {
      code: 'var a = new String("a");',
      errors: [{ message: "Do not use String as a constructor." }],
    },
    {
      code: 'var a = new Number("1");',
      errors: [{ message: "Do not use Number as a constructor." }],
    },
    {
      code: 'var a = new Boolean("true");',
      errors: [{ message: "Do not use Boolean as a constructor." }],
    },
  ],
})
