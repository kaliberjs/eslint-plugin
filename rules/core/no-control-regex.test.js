const { RuleTester } = require('eslint')
const { builtinRules } = require('eslint/use-at-your-own-risk')
const rule = builtinRules.get('no-control-regex')

const ruleTester = new RuleTester({ languageOptions: { ecmaVersion: 2020, sourceType: 'module' } })

ruleTester.run('no-control-regex', rule, {
  valid: [
    'const regex = /x1f/',
  ],
  invalid: [
    {
      code: `const regex = new RegExp("\x1f")`,
      errors: [{ message: 'Unexpected control character(s) in regular expression: \\x1f.' }],
    },
  ],
})
