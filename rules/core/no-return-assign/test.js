const { RuleTester } = require('eslint');
const rule = require('.');

const ruleTester = new RuleTester();

ruleTester.run('no-return-assign', rule, {
  valid: [
    'function foo() { var x = 1; return x; }',
    {
      code: 'function foo() { return (x = 1); }',
      options: ['except-parens'],
    },
  ],
  invalid: [
    {
      code: 'function foo() { return x = 1; }',
      errors: [{ message: 'Return statement should not contain assignment.' }],
    },
    {
      code: 'function foo() { return (x = 1); }',
      options: ['always'],
      errors: [{ message: 'Return statement should not contain assignment.' }],
    },
  ],
});
