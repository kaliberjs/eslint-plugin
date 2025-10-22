const { RuleTester } = require('eslint');
const rule = require('.');

const ruleTester = new RuleTester();

ruleTester.run('semi', rule, {
  valid: [
    { code: 'var a = 1;', options: ['always'] },
    { code: 'var a = 1', options: ['never'] },
  ],
  invalid: [
    {
      code: 'var a = 1',
      output: 'var a = 1;',
      options: ['always'],
      errors: [{ message: 'Missing semicolon.' }],
    },
    {
      code: 'var a = 1;',
      output: 'var a = 1',
      options: ['never'],
      errors: [{ message: 'Extra semicolon.' }],
    },
  ],
});
