const { RuleTester } = require('eslint')
const { Linter } = require('eslint')
const linter = new Linter()
const rule = linter.getRules().get('no-script-url')

const ruleTester = new RuleTester()

ruleTester.run('no-script-url', rule, {
  valid: [
    { code: 'location.href = "foo.html";' },
  ],
  invalid: [
    {
      code: 'location.href = "javascript:void(0)";',
      errors: [{ message: "Script URL is a form of eval." }],
    },
    {
      code: 'location.href = `javascript:void(0)`;',
      parserOptions: { ecmaVersion: 6 },
      errors: [{ message: "Script URL is a form of eval." }],
    },
  ],
})
