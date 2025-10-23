const { RuleTester } = require('eslint');
const rule = require('eslint/lib/rules/no-irregular-whitespace');

const ruleTester = new RuleTester();

ruleTester.run('no-irregular-whitespace', rule, {
  valid: [
    'var a = 1;',
  ],
  invalid: [
    {
      code: 'var a = \u000b1;',
      errors: [{ message: 'Irregular whitespace not allowed.' }],
    },
  ],
});
