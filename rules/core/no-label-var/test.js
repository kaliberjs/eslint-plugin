const { RuleTester } = require('eslint');
const rule = require('.');

const ruleTester = new RuleTester();

ruleTester.run('no-label-var', rule, {
  valid: [
    'var x = 1; y: while(x) { break y; }',
  ],
  invalid: [
    {
      code: 'var x = 1; x: while(true) { break x; }',
      errors: [{ message: "Found identifier with same name as label." }],
    },
  ],
});
