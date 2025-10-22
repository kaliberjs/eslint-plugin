const { RuleTester } = require('eslint')
const rule = require('eslint/lib/rules/no-control-regex')

const ruleTester = new RuleTester({
  parserOptions: {
    ecmaVersion: 6,
    sourceType: 'module',
  }
})

ruleTester.run('no-control-regex', rule, {
  valid: [
    `const regex = /x1f/`,
  ],
  invalid: [
    {
      code: `const regex = new RegExp("\x1f")`,
      errors: [{ message: "Unexpected control character(s) in regular expression: \\x1f." }],
    },
  ],
})
