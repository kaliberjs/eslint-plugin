const { RuleTester } = require('eslint')
const rule = require('eslint/use-at-your-own-risk').builtinRules.get('no-debugger')

const ruleTester = new RuleTester({
  parserOptions: {
    ecmaVersion: 6,
    sourceType: 'module',
  }
})

ruleTester.run('no-debugger', rule, {
  valid: [
    `const a = 1;`,
  ],
  invalid: [
    {
      code: `debugger;`,
      errors: [{ message: "Unexpected 'debugger' statement." }],
    },
  ],
})
