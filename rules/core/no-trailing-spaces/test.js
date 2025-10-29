const { RuleTester } = require('eslint');
const rule = require('.');

const ruleTester = new RuleTester();

ruleTester.run('no-trailing-spaces', rule, {
  valid: [
    'var a = 1;',
  ],
  invalid: [
    {
      code: 'var a = 1; ',
      output: 'var a = 1;',
      errors: [{ message: 'Trailing spaces not allowed.' }],
    },
    {
      code: 'var a = 1;\t',
      output: 'var a = 1;',
      errors: [{ message: 'Trailing spaces not allowed.' }],
    },
  ],
});
