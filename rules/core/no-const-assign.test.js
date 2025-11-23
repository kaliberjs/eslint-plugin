const { RuleTester } = require('eslint')
const rule = require('eslint/use-at-your-own-risk').builtinRules.get('no-const-assign')

const ruleTester = new RuleTester({
  parserOptions: {
    ecmaVersion: 6,
    sourceType: 'module',
  }
})

ruleTester.run('no-const-assign', rule, {
  valid: [
    `const a = 1;`,
  ],
  invalid: [
    {
      code: `const a = 1; a = 2;`,
      errors: [{ message: "'a' is constant." }],
    },
  ],
})
