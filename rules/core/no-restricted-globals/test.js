const { RuleTester } = require('eslint');
const { builtinRules } = require('eslint/use-at-your-own-risk');
const rule = builtinRules.get('no-restricted-globals');

const ruleTester = new RuleTester();

ruleTester.run('no-restricted-globals', rule, {
  valid: [
    {
      code: 'foo()',
      options: ['error', 'bar'],
    },
  ],
  invalid: [
    {
      code: 'error()',
      options: ['error'],
      errors: [{ message: "Unexpected use of 'error'." }],
    },
  ],
});
