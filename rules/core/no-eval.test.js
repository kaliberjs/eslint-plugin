const { RuleTester } = require('eslint')
const rule = require('eslint/use-at-your-own-risk').builtinRules.get('no-eval')

const ruleTester = new RuleTester({
  parserOptions: {
    ecmaVersion: 6,
    sourceType: 'module',
  }
})

ruleTester.run('no-eval', rule, {
  valid: [
    `parseInt("10")`,
  ],
  invalid: [
    {
      code: `eval("10")`,
      errors: [{ message: "eval can be harmful." }],
    },
  ],
})
