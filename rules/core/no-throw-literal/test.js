const { RuleTester } = require('eslint')
const { Linter } = require('eslint')
const linter = new Linter()
const rule = linter.getRules().get('no-throw-literal')

const ruleTester = new RuleTester()

ruleTester.run('no-throw-literal', rule, {
  valid: [
    { code: 'throw new Error();' },
    { code: 'throw new Error("error");' },
    { code: 'var e = new Error(); throw e;' },
  ],
  invalid: [
    {
      code: 'throw "error";',
      errors: [{ message: "Expected an error object to be thrown." }],
    },
    {
      code: 'throw 1;',
      errors: [{ message: "Expected an error object to be thrown." }],
    },
    {
      code: 'throw undefined;',
      errors: [{ message: "Do not throw undefined." }],
    },
  ],
})
