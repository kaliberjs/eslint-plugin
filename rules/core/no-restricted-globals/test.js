const { RuleTester } = require('eslint');
const rule = require('eslint/use-at-your-own-risk').builtinRules.get('no-restricted-globals');

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
