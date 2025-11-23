const { RuleTester } = require('eslint')
const rule = require('eslint/use-at-your-own-risk').builtinRules.get('no-delete-var')

const ruleTester = new RuleTester({
  parserOptions: {
    ecmaVersion: 6,
  }
})

ruleTester.run('no-delete-var', rule, {
  valid: [
    `const obj = { a: 1 }; delete obj.a;`,
  ],
  invalid: [
    {
      code: `let a; delete a;`,
      errors: [{ message: "Variables should not be deleted." }],
    },
  ],
})
