const { RuleTester } = require('eslint')
const { builtinRules } = require('eslint/use-at-your-own-risk')
const rule = builtinRules.get('no-useless-computed-key')

const ruleTester = new RuleTester({ languageOptions: { ecmaVersion: 2020 } })

ruleTester.run('no-useless-computed-key', rule, {
  valid: [
    { code: 'var a = { [b]: 1 };' },
  ],
  invalid: [
    {
      code: 'var a = { ["a"]: 1 };',
      output: 'var a = { "a": 1 };',
      errors: [{ message: 'Unnecessarily computed property ["a"] found.' }],
    },
  ],
})
