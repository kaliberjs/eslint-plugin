const { RuleTester } = require('eslint');
const rule = require('.');

const ruleTester = new RuleTester();

ruleTester.run('space-infix-ops', rule, {
  valid: [
    'a + b',
    'a + b',
  ],
  invalid: [
    {
      code: 'a+b',
      output: 'a + b',
      errors: [{ message: "Operator '+' must be spaced." }],
    },
  ],
});
