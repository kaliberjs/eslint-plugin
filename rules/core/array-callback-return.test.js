const { RuleTester } = require('eslint')
const rule = require('eslint/use-at-your-own-risk').builtinRules.get('array-callback-return')

const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 6 } })

ruleTester.run('array-callback-return', rule, {
  valid: [
    { code: '[1, 2, 3].map(x => x * 2)' },
    { code: '[1, 2, 3].map(x => { return x * 2 })' },
  ],
  invalid: [
    {
      code: '[1, 2, 3].map(x => { })',
      errors: [{ message: "Array.prototype.map() expects a return value from arrow function." }],
    },
  ],
})
