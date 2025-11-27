const { RuleTester } = require('eslint')
const rule = require('eslint/lib/rules/no-eval')

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
