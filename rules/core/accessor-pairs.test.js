const { RuleTester } = require('eslint')
const { builtinRules } = require('eslint/use-at-your-own-risk')
const rule = builtinRules.get('accessor-pairs')

const ruleTester = new RuleTester({ languageOptions: { ecmaVersion: 2020 } })

ruleTester.run('accessor-pairs', rule, {
  valid: [
    { code: 'const obj = { get a() { return this._a }, set a(v) { this._a = v } }' },
  ],
  invalid: [
    {
      code: 'const obj = { set a(v) { this._a = v } }',
      errors: [{ message: "Getter is not present for setter 'a'." }],
    },
  ],
})
