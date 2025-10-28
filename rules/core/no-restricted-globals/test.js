const { RuleTester } = require('eslint');
const rule = require('eslint/lib/rules/no-restricted-globals');

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
