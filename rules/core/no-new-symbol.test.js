const { RuleTester } = require('eslint')
const { builtinRules } = require('eslint/use-at-your-own-risk')
const rule = builtinRules.get('no-new-native-nonconstructor')

const ruleTester = new RuleTester({ languageOptions: { ecmaVersion: 2020, sourceType: 'module' } })

ruleTester.run('no-new-native-nonconstructor', rule, {
  valid: [
    `const s = Symbol('foo')`,
    "const b = BigInt(9007199254740991)",
  ],
  invalid: [
    {
      code: `const s = new Symbol('foo')`,
      errors: [{ messageId: 'noNewNonconstructor' }],
    },
  ],
})
