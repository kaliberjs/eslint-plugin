const { RuleTester } = require('eslint')
const rule = require('eslint/use-at-your-own-risk').builtinRules.get('eqeqeq')

const ruleTester = new RuleTester({
  parserOptions: {
    ecmaVersion: 6,
    sourceType: 'module',
  }
})

ruleTester.run('eqeqeq', rule, {
  valid: [
    `a === b`,
    `a !== b`,
  ],
  invalid: [
    {
      code: `a == b`,
      errors: [{ message: "Expected '===' and instead saw '=='." }],
    },
    {
      code: `a != b`,
      errors: [{ message: "Expected '!==' and instead saw '!='." }],
    },
  ],
})
