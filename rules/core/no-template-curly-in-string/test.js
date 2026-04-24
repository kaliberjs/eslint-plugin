const { RuleTester } = require('eslint')
const { builtinRules } = require('eslint/use-at-your-own-risk')
const rule = builtinRules.get('no-template-curly-in-string')

const ruleTester = new RuleTester()

ruleTester.run('no-template-curly-in-string', rule, {
  valid: [
    { code: '`Hello, ${name}!`', languageOptions: { ecmaVersion: 2020 } },
    { code: '"Hello, name!"' },
  ],
  invalid: [
    {
      code: '"Hello, ${name}!"',
      errors: [{ message: 'Unexpected template string expression.' }],
    },
    {
      code: "'Hello, ${name}!'",
      errors: [{ message: 'Unexpected template string expression.' }],
    },
  ],
})
