const { RuleTester } = require('eslint')
const { builtinRules } = require('eslint/use-at-your-own-risk')
const rule = builtinRules.get('no-extend-native')

const ruleTester = new RuleTester({ languageOptions: { ecmaVersion: 2020, sourceType: 'module' } })

ruleTester.run('no-extend-native', rule, {
  valid: [
    'const a = {}; a.extra = 55;',
  ],
  invalid: [
    {
      code: 'Object.prototype.extra = 55;',
      errors: [{ message: 'Object prototype is read only, properties should not be added.' }],
    },
  ],
})
