const { RuleTester } = require('eslint')
const rule = require('eslint/lib/rules/no-empty-pattern')

const ruleTester = new RuleTester({
  parserOptions: {
    ecmaVersion: 6,
    sourceType: 'module',
  }
})

ruleTester.run('no-empty-pattern', rule, {
  valid: [
    `const { a } = {}`,
  ],
  invalid: [
    {
      code: `const {} = {}`,
      errors: [{ message: "Unexpected empty object pattern." }],
    },
    {
      code: `const [] = []`,
      errors: [{ message: "Unexpected empty array pattern." }],
    },
  ],
})
