const { RuleTester } = require('eslint')
const { Linter } = require('eslint')
const linter = new Linter()
const rule = linter.getRules().get('no-shadow-restricted-names')

const ruleTester = new RuleTester()

ruleTester.run('no-shadow-restricted-names', rule, {
  valid: [
    { code: 'function foo(bar) {}' },
  ],
  invalid: [
    {
      code: 'var undefined = 1;',
      errors: [{ message: "Shadowing of global property 'undefined'." }],
    },
    {
      code: 'function foo(undefined) {}',
      errors: [{ message: "Shadowing of global property 'undefined'." }],
    },
    {
      code: 'var undefined = 1; function foo(bar) {}',
      errors: [{ message: "Shadowing of global property 'undefined'." }],
    },
    {
      code: 'function NaN() {}',
      errors: [{ message: "Shadowing of global property 'NaN'." }],
    },
  ],
})
