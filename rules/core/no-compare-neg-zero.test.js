const { RuleTester } = require('eslint')
const rule = require('eslint/lib/rules/no-compare-neg-zero')

const ruleTester = new RuleTester({
  parserOptions: {
    ecmaVersion: 6,
    sourceType: 'module',
  }
})

ruleTester.run('no-compare-neg-zero', rule, {
  valid: [
    `x > 0`,
  ],
  invalid: [
    {
      code: `x === -0`,
      errors: [{ message: "Do not use the '===' operator to compare against -0." }],
    },
  ],
})
