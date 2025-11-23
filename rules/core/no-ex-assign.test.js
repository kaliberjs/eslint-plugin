const { RuleTester } = require('eslint')
const rule = require('eslint/use-at-your-own-risk').builtinRules.get('no-ex-assign')

const ruleTester = new RuleTester({
  parserOptions: {
    ecmaVersion: 6,
    sourceType: 'module',
  }
})

ruleTester.run('no-ex-assign', rule, {
  valid: [
    `try {} catch (e) {}`,
  ],
  invalid: [
    {
      code: `try {} catch (e) { e = 10; }`,
      errors: [{ message: "Do not assign to the exception parameter." }],
    },
  ],
})
