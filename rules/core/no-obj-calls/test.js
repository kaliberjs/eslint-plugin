const { RuleTester } = require('eslint');
const rule = require('eslint/use-at-your-own-risk').builtinRules.get('no-obj-calls');

const ruleTester = new RuleTester({ env: { es6: true } });

ruleTester.run('no-obj-calls', rule, {
  valid: [
    'Math.max(1, 2);',
    'JSON.parse("{}");',
    'Reflect.get({ x: 1 }, "x");',
  ],
  invalid: [
    {
      code: 'Math();',
      errors: [{ message: "'Math' is not a function." }],
    },
    {
      code: 'JSON();',
      errors: [{ message: "'JSON' is not a function." }],
    },
    {
        code: 'Reflect();',
        errors: [{ message: "'Reflect' is not a function." }],
    }
  ],
});
