const { RuleTester } = require('eslint')
const { builtinRules } = require('eslint/use-at-your-own-risk')
const rule = builtinRules.get('no-multi-str')

const ruleTester = new RuleTester({ languageOptions: { sourceType: 'script' } })

ruleTester.run('no-multi-str', rule, {
  valid: [
    { code: 'var a = "b";' },
    { code: 'var a = "b\\nc";' },
    { code: 'var a = `b\nc`;', languageOptions: { ecmaVersion: 2020 } },
  ],
  invalid: [
    {
      code: 'var a = "b\\\nc";',
      errors: [{ message: 'Multiline support is limited to browsers supporting ES5 only.' }],
    },
  ],
})
