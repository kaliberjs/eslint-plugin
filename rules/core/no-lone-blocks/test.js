const { RuleTester } = require('eslint');
const rule = require('.');

const ruleTester = new RuleTester();

ruleTester.run('no-lone-blocks', rule, {
  valid: [
    'if (foo) { bar(); }',
    'while (foo) { bar(); }',
    'function foo() { bar(); }',
  ],
  invalid: [
    {
      code: '{ bar(); }',
      errors: [{ message: 'Block is redundant.' }],
    },
    {
      code: 'if (foo) { { bar(); } }',
      errors: [{ message: 'Nested block is redundant.' }],
    },
  ],
});
