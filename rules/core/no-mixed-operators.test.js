const { RuleTester } = require('eslint');
const rule = require('eslint/use-at-your-own-risk').builtinRules.get('no-mixed-operators');

const ruleTester = new RuleTester();

ruleTester.run('no-mixed-operators', rule, {
  valid: [
    'a + b - c',
  ],
  invalid: [
    {
      code: 'a + b * c',
      errors: [
        { message: "Unexpected mix of '+' and '*'. Use parentheses to clarify the intended order of operations." },
        { message: "Unexpected mix of '+' and '*'. Use parentheses to clarify the intended order of operations." }
    ],
    },
  ],
});
