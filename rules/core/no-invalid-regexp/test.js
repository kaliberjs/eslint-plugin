const { RuleTester } = require('eslint');
const rule = require('.');

const ruleTester = new RuleTester();

ruleTester.run('no-invalid-regexp', rule, {
  valid: [
    'new RegExp(".")',
    'new RegExp("[a-z]")',
  ],
  invalid: [
    {
      code: 'new RegExp("[")',
      errors: [{ message: 'Invalid regular expression: /[/: Unterminated character class.' }],
    },
    {
      code: 'new RegExp(")", ")")',
      errors: [{ message: "Invalid flags supplied to RegExp constructor ')'." }],
    },
  ],
});
