const { RuleTester } = require('eslint')
const rule = require('eslint/use-at-your-own-risk').builtinRules.get('no-dupe-args')

const ruleTester = new RuleTester({
  parserOptions: {
    ecmaVersion: 6,
  }
})

ruleTester.run('no-dupe-args', rule, {
  valid: [
    `function foo(a, b, c) {}`,
  ],
  invalid: [
    {
      code: `function foo(a, b, a) {}`,
      errors: [{ message: "Duplicate param 'a'." }],
    },
  ],
})
