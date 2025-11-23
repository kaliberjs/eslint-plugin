const { RuleTester } = require('eslint')
const rule = require('eslint/use-at-your-own-risk').builtinRules.get('no-dupe-keys')

const ruleTester = new RuleTester({
  parserOptions: {
    ecmaVersion: 6,
    sourceType: 'module',
  }
})

ruleTester.run('no-dupe-keys', rule, {
  valid: [
    `const obj = { a: 1, b: 2 }`,
  ],
  invalid: [
    {
      code: `const obj = { a: 1, a: 2 }`,
      errors: [{ message: "Duplicate key 'a'." }],
    },
  ],
})
