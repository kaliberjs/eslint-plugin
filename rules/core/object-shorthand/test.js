const { RuleTester } = require('eslint');
const rule = require('.');

const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 6 } });

ruleTester.run('object-shorthand', rule, {
  valid: [
    { code: 'var foo = { x };', options: ['always'] },
    { code: 'var foo = { x: x };', options: ['never'] },
  ],
  invalid: [
    {
      code: 'var foo = { x: x };',
      output: 'var foo = { x };',
      options: ['always'],
      errors: [{ message: 'Expected property shorthand.' }],
    },
    {
      code: 'var foo = { x };',
      output: 'var foo = { x: x };',
      options: ['never'],
      errors: [{ message: 'Expected longform property syntax.' }],
    },
  ],
});
