const { RuleTester } = require('eslint')
const rule = require('eslint/lib/rules/brace-style')

const ruleTester = new RuleTester()

ruleTester.run('brace-style', rule, {
  valid: [
    { code: 'if (foo) {\nbar()\n}' },
  ],
  invalid: [
    {
      code: 'if (foo)\n{\nbar()\n}',
      output: 'if (foo) {\nbar()\n}',
      errors: [{ message: "Opening curly brace does not appear on the same line as controlling statement." }],
    },
    {
      code: 'if (foo) { bar() }',
      output: 'if (foo) {\n bar() \n}',
      errors: [
        { message: "Statement inside of curly braces should be on next line." },
        { message: "Closing curly brace should be on the same line as opening curly brace or on the line after the previous block." }
      ],
    }
  ],
})
