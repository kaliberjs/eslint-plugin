const { RuleTester } = require('eslint')
const { builtinRules } = require('eslint/use-at-your-own-risk')
const rule = builtinRules.get('no-array-constructor')

const ruleTester = new RuleTester({ languageOptions: { ecmaVersion: 2020, sourceType: 'module' } })

ruleTester.run('no-array-constructor', rule, {
  valid: [
    "const arr = []",
    "const arr = new Array(5)",
  ],
  invalid: [
    {
      code: "const arr = new Array()",
      output: 'const arr = []',
      errors: [{ message: 'The array literal notation [] is preferable.' }],
    },
    {
      code: "const arr = new Array(1, 2, 3)",
      output: "const arr = [1, 2, 3]",
      errors: [{ message: 'The array literal notation [] is preferable.' }],
    },
  ],
})
