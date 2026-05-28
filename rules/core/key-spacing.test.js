const { RuleTester } = require('eslint')
const { builtinRules } = require('eslint/use-at-your-own-risk')
const rule = builtinRules.get('key-spacing')

const ruleTester = new RuleTester({ languageOptions: { ecmaVersion: 2020, sourceType: 'module' } })

ruleTester.run('key-spacing', rule, {
  valid: [
    'const obj = { a: 1 }',
  ],
  invalid: [
    {
      code: 'const obj = { a:1 }',
      output: 'const obj = { a: 1 }',
      errors: [{ message: "Missing space before value for key 'a'." }],
    },
    {
      code: 'const obj = { a : 1 }',
      output: 'const obj = { a: 1 }',
      errors: [{ message: "Extra space after key 'a'." }],
    },
  ],
})
