const { RuleTester } = require('eslint')
const { Linter } = require('eslint')
const linter = new Linter()
const rule = linter.getRules().get('no-template-curly-in-string')

const ruleTester = new RuleTester()

ruleTester.run('no-template-curly-in-string', rule, {
  valid: [
    { code: '`Hello, ${name}!`', parserOptions: { ecmaVersion: 6 } },
    { code: '"Hello, name!"' },
  ],
  invalid: [
    {
      code: '"Hello, ${name}!"',
      errors: [{ message: "Unexpected template string expression." }],
    },
    {
      code: "'Hello, ${name}!'",
      errors: [{ message: "Unexpected template string expression." }],
    },
  ],
})
