const { RuleTester } = require('eslint');
const rule = require('eslint/lib/rules/no-unneeded-ternary');

const ruleTester = new RuleTester();

ruleTester.run('no-unneeded-ternary', rule, {
  valid: [
    'a ? b : c',
  ],
  invalid: [
    {
      code: 'a ? true : false',
      output: '!!a',
      errors: [{ message: 'Unnecessary use of boolean literals in conditional expression.' }],
    },
  ],
});
