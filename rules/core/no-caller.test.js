const { RuleTester } = require('eslint')
const rule = require('eslint/use-at-your-own-risk').builtinRules.get('no-caller')

const ruleTester = new RuleTester({
  parserOptions: {
    ecmaVersion: 6,
    sourceType: 'module',
  }
})

ruleTester.run('no-caller', rule, {
  valid: [
    `function foo() {}`,
  ],
  invalid: [
    {
      code: `function foo() { return arguments.caller; }`,
      errors: [{ message: "Avoid arguments.caller." }],
    },
    {
      code: `function foo() { return arguments.callee; }`,
      errors: [{ message: "Avoid arguments.callee." }],
    },
  ],
})
