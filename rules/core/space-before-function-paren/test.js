const { RuleTester } = require('eslint');
const rule = require('.');

const ruleTester = new RuleTester();

ruleTester.run('space-before-function-paren', rule, {
  valid: [
    { code: 'function foo () {}', options: ['always'] },
    { code: 'function foo() {}', options: ['never'] },
  ],
  invalid: [
    {
      code: 'function foo() {}',
      output: 'function foo () {}',
      options: ['always'],
      errors: [{ message: 'Missing space before function parentheses.' }],
    },
    {
      code: 'function foo () {}',
      output: 'function foo() {}',
      options: ['never'],
      errors: [{ message: 'Unexpected space before function parentheses.' }],
    },
  ],
});
