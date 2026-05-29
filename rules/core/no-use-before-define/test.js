const { RuleTester } = require('eslint')
const { builtinRules } = require('eslint/use-at-your-own-risk')
const rule = builtinRules.get('no-use-before-define')

const ruleTester = new RuleTester()

ruleTester.run('no-use-before-define', rule, {
  valid: [
    { code: 'var a = 1; var b = a;' },
    { code: 'function b() { return 1; } b();' },
    { code: 'var b = () => 1; b();', languageOptions: { ecmaVersion: 2020 } },
    { code: 'b(); function b() { return 1; }', options: [{ functions: false }] },
  ],
  invalid: [
    {
      code: 'a = 1; var a;',
      errors: [{ message: "'a' was used before it was defined." }],
    },
  ],
})
