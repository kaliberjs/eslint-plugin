const { RuleTester } = require('eslint')
const { builtinRules } = require('eslint/use-at-your-own-risk')
const rule = builtinRules.get('no-dupe-args')

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2020,
    sourceType: 'script',
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
