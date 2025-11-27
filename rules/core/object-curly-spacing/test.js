const { RuleTester } = require('eslint');
const rule = require('.');

const ruleTester = new RuleTester();

ruleTester.run('object-curly-spacing', rule, {
  valid: [
    { code: 'var obj = { foo: "bar" };', options: ['always'] },
    { code: 'var obj = {foo: "bar"};', options: ['never'] },
  ],
  invalid: [
    {
      code: 'var obj = {foo: "bar"};',
      output: 'var obj = { foo: "bar" };',
      options: ['always'],
      errors: [{ message: "A space is required after '{'." }, { message: "A space is required before '}'." }],
    },
    {
      code: 'var obj = { foo: "bar" };',
      output: 'var obj = {foo: "bar"};',
      options: ['never'],
      errors: [{ message: "There should be no space after '{'." }, { message: "There should be no space before '}'." }],
    },
  ],
});
