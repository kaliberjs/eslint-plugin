const { RuleTester } = require('eslint')
const { Linter } = require('eslint')
const linter = new Linter()
const rule = linter.getRules().get('no-redeclare')

const ruleTester = new RuleTester()

ruleTester.run('no-redeclare', rule, {
  valid: [
    { code: 'var a = 1; var b = 2;' },
    { code: 'var a = 1;', options: [{ builtinGlobals: false }] },
  ],
  invalid: [
    {
      code: 'var a = 1; var a = 2;',
      errors: [{ message: "'a' is already defined." }],
    },
    {
      code: 'var a = 1; var a = 2;',
      options: [{ builtinGlobals: true }],
      errors: [{ message: "'a' is already defined." }],
    },
    {
      code: 'var Object = 1;',
      options: [{ builtinGlobals: true }],
      errors: [{ message: "'Object' is already defined as a built-in global variable." }],
    },
  ],
})
