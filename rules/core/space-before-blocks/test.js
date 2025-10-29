const { RuleTester } = require('eslint');
const rule = require('.');

const ruleTester = new RuleTester();

ruleTester.run('space-before-blocks', rule, {
  valid: [
    { code: 'if (a) {}', options: ['always'] },
    { code: 'if (a){}', options: ['never'] },
  ],
  invalid: [
    {
      code: 'if (a){}',
      output: 'if (a) {}',
      options: ['always'],
      errors: [{ message: 'Missing space before opening brace.' }],
    },
    {
      code: 'if (a) {}',
      output: 'if (a){}',
      options: ['never'],
      errors: [{ message: 'Unexpected space before opening brace.' }],
    },
  ],
});
