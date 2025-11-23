const { RuleTester } = require('eslint')
const rule = require('eslint/use-at-your-own-risk').builtinRules.get('no-constant-condition')

const ruleTester = new RuleTester({
  parserOptions: {
    ecmaVersion: 6,
    sourceType: 'module',
  }
})

ruleTester.run('no-constant-condition', rule, {
  valid: [
    `if (a === 0) {}`,
  ],
  invalid: [
    {
      code: `if (true) {}`,
      errors: [{ message: "Unexpected constant condition." }],
    },
    {
      code: `for (;-2;){}`,
      errors: [{ message: "Unexpected constant condition." }],
    },
  ],
})
