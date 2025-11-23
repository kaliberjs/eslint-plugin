const { RuleTester } = require('eslint');
const rule = require('eslint/use-at-your-own-risk').builtinRules.get('no-extra-parens');

const ruleTester = new RuleTester();

ruleTester.run('no-extra-parens', rule, {
  valid: [
    'a = b',
  ],
  invalid: [
    {
      code: '(a = b)',
      output: 'a = b',
      errors: [{ message: 'Unnecessary parentheses around expression.' }],
    },
  ],
});
