const { RuleTester } = require('eslint')
const { builtinRules } = require('eslint/use-at-your-own-risk')
const rule = builtinRules.get('no-object-constructor')

const ruleTester = new RuleTester({ languageOptions: { ecmaVersion: 2020, sourceType: 'module' } })

ruleTester.run('no-object-constructor', rule, {
  valid: [
    'const obj = {}',
    'const obj = { a: 1 }',
    'const obj = Object.create(null)',
  ],
  invalid: [
    {
      code: 'const obj = new Object()',
      errors: [{
        messageId: 'preferLiteral',
        suggestions: [{ messageId: 'useLiteral', output: 'const obj = {}' }],
      }],
    },
  ],
})
