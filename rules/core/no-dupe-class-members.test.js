const { RuleTester } = require('eslint')
const rule = require('eslint/use-at-your-own-risk').builtinRules.get('no-dupe-class-members')

const ruleTester = new RuleTester({
  parserOptions: {
    ecmaVersion: 6,
    sourceType: 'module',
  }
})

ruleTester.run('no-dupe-class-members', rule, {
  valid: [
    `class A { a() {} b() {} }`,
  ],
  invalid: [
    {
      code: `class A { a() {} a() {} }`,
      errors: [{ message: "Duplicate name 'a'." }],
    },
  ],
})
