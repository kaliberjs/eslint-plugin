const { RuleTester } = require('eslint');
const rule = require('.');

const ruleTester = new RuleTester();

ruleTester.run('semi-spacing', rule, {
  valid: [
    { code: 'var a = 1;', options: [{ before: false, after: true }] },
    { code: 'var a = 1 ;', options: [{ before: true, after: true }] },
  ],
  invalid: [
    {
      code: 'var a = 1 ;',
      output: 'var a = 1;',
      options: [{ before: false, after: true }],
      errors: [{ message: 'Unexpected whitespace before semicolon.' }],
    },
    {
      code: 'var a = 1;',
      output: 'var a = 1 ;',
      options: [{ before: true, after: true }],
      errors: [{ message: 'Missing whitespace before semicolon.' }],
    },
  ],
});
