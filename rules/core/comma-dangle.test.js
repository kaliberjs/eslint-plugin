const { RuleTester } = require('eslint')
const rule = require('eslint/use-at-your-own-risk').builtinRules.get('comma-dangle')

const ruleTester = new RuleTester({
  parserOptions: {
    ecmaVersion: 6,
    sourceType: 'module',
  }
})

ruleTester.run('comma-dangle', rule, {
  valid: [
    `const obj = { a: 1, b: 2 }`,
    `const arr = [1, 2]`,
  ],
  invalid: [
    {
      code: `const obj = { a: 1, b: 2, }`,
      output: `const obj = { a: 1, b: 2 }`,
      errors: [{ message: "Unexpected trailing comma." }],
    },
    {
      code: `const arr = [1, 2,]`,
      output: `const arr = [1, 2]`,
      errors: [{ message: "Unexpected trailing comma." }],
    },
  ],
})
