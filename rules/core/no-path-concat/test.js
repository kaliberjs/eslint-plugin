const { RuleTester } = require('eslint');
const rule = require('.');

const ruleTester = new RuleTester({ env: { node: true } });

ruleTester.run('no-path-concat', rule, {
  valid: [
    'var fullPath = path.join(__dirname, "foo.js");',
    'var fullPath = path.resolve(__dirname, "foo.js");',
  ],
  invalid: [
    {
      code: 'var fullPath = __dirname + "/foo.js";',
      errors: [{ message: 'Use path.join() or path.resolve() instead of + to create paths.' }],
    },
    {
      code: 'var fullPath = __filename + "/foo.js";',
      errors: [{ message: 'Use path.join() or path.resolve() instead of + to create paths.' }],
    },
  ],
});
