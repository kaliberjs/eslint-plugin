const { RuleTester } = require('eslint');
const rule = require('.');

const ruleTester = new RuleTester();

ruleTester.run('no-mixed-spaces-and-tabs', rule, {
  valid: [
    '\tvar x = 5;',
    '    var x = 5;',
  ],
  invalid: [
    {
      code: '\t var x = 5;',
      errors: [{ message: 'Mixed spaces and tabs.' }],
    },
    {
      code: ' \tvar x = 5;',
      errors: [{ message: 'Mixed spaces and tabs.' }],
    },
  ],
});
