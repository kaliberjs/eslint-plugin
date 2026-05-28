const { RuleTester } = require('eslint')
const { builtinRules } = require('eslint/use-at-your-own-risk')
const rule = builtinRules.get('no-script-url')

const ruleTester = new RuleTester()

ruleTester.run('no-script-url', rule, {
  valid: [
    { code: 'location.href = "foo.html";' },
  ],
  invalid: [
    {
      code: 'location.href = "javascript:void(0)";',
      errors: [{ message: 'Script URL is a form of eval.' }],
    },
    {
      code: 'location.href = `javascript:void(0)`;',
      languageOptions: { ecmaVersion: 2020 },
      errors: [{ message: 'Script URL is a form of eval.' }],
    },
  ],
})
