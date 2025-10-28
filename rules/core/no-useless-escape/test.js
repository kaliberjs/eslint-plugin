const { RuleTester } = require('eslint');
const rule = require('eslint/lib/rules/no-useless-escape');

const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 2018 } });

ruleTester.run('no-useless-escape', rule, {
  valid: [
    '"\\""',
    '/\\d/',
  ],
  invalid: [
    {
      code: '"\\a"',
      errors: [{ message: "Unnecessary escape character: \\a." }],
    },
    {
      code: '`\\a`',
      errors: [{ message: "Unnecessary escape character: \\a." }],
    },
    {
      code: '/\\a/',
      errors: [{ message: "Unnecessary escape character: \\a." }],
    },
  ],
});
