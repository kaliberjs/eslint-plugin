const { RuleTester } = require('eslint')
const { builtinRules } = require('eslint/use-at-your-own-risk')
const rule = builtinRules.get('no-dupe-keys')

const ruleTester = new RuleTester({ languageOptions: { ecmaVersion: 2020, sourceType: 'module' } })

ruleTester.run('no-dupe-keys', rule, {
  valid: [
    'const obj = { a: 1, b: 2 }',
  ],
  invalid: [
    {
      code: 'const obj = { a: 1, a: 2 }',
      errors: [{ message: "Duplicate key 'a'." }],
    },
  ],
})
