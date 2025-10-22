const { RuleTester } = require('eslint')
const rule = require('eslint/lib/rules/indent')

const ruleTester = new RuleTester()

ruleTester.run('indent', rule, {
  valid: [
    { code: 'if (foo) {\n    bar()\n}' },
  ],
  invalid: [
    {
      code: 'if (foo) {\n  bar()\n}',
      output: 'if (foo) {\n    bar()\n}',
      errors: [{ message: "Expected indentation of 4 spaces but found 2." }],
    },
  ],
})
