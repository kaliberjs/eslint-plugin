const { RuleTester } = require('eslint');
const rule = require('.');

const ruleTester = new RuleTester({
  globals: {
    window: 'writable',
  },
  env: {
    browser: true,
  },
});

ruleTester.run('no-global-assign', rule, {
  valid: [
    'window = 1;',
  ],
  invalid: [
    {
      code: 'Object = 1;',
      errors: [{ message: "Read-only global 'Object' should not be modified." }],
    },
    {
      code: 'top = 1;',
      errors: [{ message: "Read-only global 'top' should not be modified." }],
    },
  ],
});
