const { RuleTester } = require('eslint')
const rule = require('eslint/lib/rules/default-case')

const ruleTester = new RuleTester()

ruleTester.run('default-case', rule, {
  valid: [
    {
      code: 'switch (a) { case 1: break; default: break; }',
    },
    {
      code: 'switch (a) { case 1: break; /* no default */ }',
      options: [{ commentPattern: '^no default$' }],
    },
  ],
  invalid: [
    {
      code: 'switch (a) { case 1: break; }',
      errors: [{ message: 'Expected a default case.' }],
    },
  ],
})
