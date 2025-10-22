const { RuleTester } = require('eslint')
const rule = require('eslint/lib/rules/comma-style')

const ruleTester = new RuleTester({
  parserOptions: {
    ecmaVersion: 6,
    sourceType: 'module',
  }
})

ruleTester.run('comma-style', rule, {
  valid: [
    `const obj = { a: 1, b: 2 }`,
    `const arr = [1, 2]`,
  ],
  invalid: [
    {
      code: `const obj = { a: 1\n, b: 2 }`,
      output: `const obj = { a: 1,\n b: 2 }`,
      errors: [{ message: "',' should be placed last." }],
    },
    {
      code: `const arr = [1\n, 2]`,
      output: `const arr = [1,\n 2]`,
      errors: [{ message: "',' should be placed last." }],
    },
  ],
})
