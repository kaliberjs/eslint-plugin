const { RuleTester } = require('eslint')
const rule = require('eslint/lib/rules/no-extra-bind')

const ruleTester = new RuleTester({
  parserOptions: {
    ecmaVersion: 6,
    sourceType: 'module',
  }
})

ruleTester.run('no-extra-bind', rule, {
  valid: [
    `const x = function () { this.foo() }.bind(this);`,
  ],
  invalid: [
    {
      code: `const x = (function () {}).bind(this);`,
      output: `const x = (function () {});`,
      errors: [{ message: "The function binding is unnecessary." }],
    },
  ],
})
