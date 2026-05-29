const { RuleTester } = require('eslint')
const { builtinRules } = require('eslint/use-at-your-own-risk')
const rule = builtinRules.get('eqeqeq')

const ruleTester = new RuleTester({ languageOptions: { ecmaVersion: 2020, sourceType: 'module' } })

ruleTester.run('eqeqeq', rule, {
  valid: [
    'a === b',
    'a !== b',
  ],
  invalid: [
    {
      code: 'a == b',
      errors: [{
        message: "Expected '===' and instead saw '=='.",
        suggestions: [{ messageId: 'replaceOperator', output: 'a === b' }],
      }],
    },
    {
      code: 'a != b',
      errors: [{
        message: "Expected '!==' and instead saw '!='.",
        suggestions: [{ messageId: 'replaceOperator', output: 'a !== b' }],
      }],
    },
  ],
})
