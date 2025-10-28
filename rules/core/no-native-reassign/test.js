const { RuleTester } = require('eslint')
const { Linter } = require('eslint')
const linter = new Linter()
const rule = linter.getRules().get('no-global-assign')

const ruleTester = new RuleTester()

ruleTester.run('no-global-assign', rule, {
  valid: [
    { code: 'a = 1;' },
    { code: 'var a = 1; a = 2;' },
  ],
  invalid: [
    {
      code: 'window = {};',
      errors: [{ message: "Read-only global 'window' should not be modified." }],
      env: { browser: true },
    },
    {
      code: 'Object = null;',
      errors: [{ message: "Read-only global 'Object' should not be modified." }],
    },
    {
      code: 'undefined = 1;',
      errors: [{ message: "Read-only global 'undefined' should not be modified." }],
    },
  ],
})
