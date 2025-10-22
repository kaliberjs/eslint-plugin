const { RuleTester } = require('eslint')
const rule = require('eslint/lib/rules/accessor-pairs')

const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 6 } })

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
