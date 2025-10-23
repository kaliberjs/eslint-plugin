const { RuleTester } = require('eslint');
const rule = require('eslint/lib/rules/quotes');

const ruleTester = new RuleTester();

ruleTester.run('quotes', rule, {
  valid: [
    { code: "'hello'", options: ['single'] },
  ],
  invalid: [
    {
      code: '"hello"',
      output: "'hello'",
      options: ['single'],
      errors: [{ message: 'Strings must use singlequote.' }],
    },
  ],
});
