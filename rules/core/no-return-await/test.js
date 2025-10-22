const { RuleTester } = require('eslint');
const rule = require('.');

const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 2017 } });

ruleTester.run('no-return-await', rule, {
  valid: [
    'async function foo() { await bar(); return; }',
    'async function foo() { return bar(); }',
  ],
  invalid: [
    {
      code: 'async function foo() { return await bar(); }',
      errors: [{ message: 'Redundant use of `await` on a return value.' }],
    },
  ],
});
