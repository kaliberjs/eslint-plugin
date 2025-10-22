const { RuleTester } = require('eslint');
const rule = require('.');

const ruleTester = new RuleTester({
  parserOptions: { ecmaVersion: 2017 },
  env: { node: true },
});

ruleTester.run('no-loop-func', rule, {
  valid: [
    'for (var i = 0; i < 10; ++i) { (function() {}) }',
    'for (let i = 0; i < 10; ++i) { (function() { console.log(i); }) }',
  ],
  invalid: [
    {
      code: 'for (var i = 0; i < 10; ++i) { (function() { console.log(i); }) }',
      errors: [{ message: "Function declared in a loop contains unsafe references to variable(s) 'i'." }],
    },
  ],
});
