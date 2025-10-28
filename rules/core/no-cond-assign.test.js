const { RuleTester } = require('eslint')
const rule = require('eslint/lib/rules/no-cond-assign')

const ruleTester = new RuleTester({
  parserOptions: {
    ecmaVersion: 6,
    sourceType: 'module',
  }
})

ruleTester.run('no-cond-assign', rule, {
  valid: [
    `if (x === 0) {}`,
  ],
  invalid: [
    {
      code: `if (x = 0) {}`,
      errors: [{ message: "Expected a conditional expression and instead saw an assignment." }],
    },
  ],
})
