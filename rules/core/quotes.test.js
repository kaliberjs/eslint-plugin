const { RuleTester } = require('eslint');
const { builtinRules } = require('eslint/use-at-your-own-risk')
const rule = builtinRules.get('quotes');

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
