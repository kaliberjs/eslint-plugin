const { RuleTester } = require('eslint');
const rule = require('.');

const ruleTester = new RuleTester();

ruleTester.run('no-floating-decimal', rule, {
  valid: [
    'var x = 0.5;',
    'var x = 1.0;',
    'var x = -0.7;',
  ],
  invalid: [
    {
      code: 'var x = .5;',
      output: 'var x = 0.5;',
      errors: [{ message: "A leading decimal point can be confused with a dot." }],
    },
    {
      code: 'var x = 5.;',
      output: 'var x = 5.0;',
      errors: [{ message: "A trailing decimal point can be confused with a dot." }],
    },
  ],
});
