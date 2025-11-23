const { RuleTester } = require('eslint')
const rule = require('eslint/use-at-your-own-risk').builtinRules.get('no-class-assign')

const ruleTester = new RuleTester({
  parserOptions: {
    ecmaVersion: 6,
    sourceType: 'module',
  }
})

ruleTester.run('no-class-assign', rule, {
  valid: [
    `class A {}`,
  ],
  invalid: [
    {
      code: `class A {}; A = 1;`,
      errors: [{ message: "'A' is a class." }],
    },
  ],
})
