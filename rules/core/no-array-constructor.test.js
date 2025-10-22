const { RuleTester } = require('eslint')
const rule = require('eslint/lib/rules/no-array-constructor')

const ruleTester = new RuleTester({
  parserOptions: {
    ecmaVersion: 6,
    sourceType: 'module',
  }
})

ruleTester.run('no-array-constructor', rule, {
  valid: [
    `const arr = []`,
    `const arr = new Array(5)`,
  ],
  invalid: [
    {
      code: `const arr = new Array()`,
      errors: [{ message: "The array literal notation [] is preferable." }],
    },
    {
      code: `const arr = new Array(1, 2, 3)`,
      errors: [{ message: "The array literal notation [] is preferable." }],
    },
  ],
})
