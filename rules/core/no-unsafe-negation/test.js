const { RuleTester } = require('eslint');
const rule = require('.');

const ruleTester = new RuleTester();

ruleTester.run('no-unsafe-negation', rule, {
  valid: [
    'if (!(key in object)) {}',
    'if (!(obj instanceof Ctor)) {}',
    '!(a in b)',
  ],
  invalid: [
    {
      code: 'if (!key in object) {}',
      errors: [{ message: "Unexpected negating the left operand of 'in' operator.", suggestions: 2 }],
    },
    {
      code: 'if (!obj instanceof Ctor) {}',
      errors: [{ message: "Unexpected negating the left operand of 'instanceof' operator.", suggestions: 2 }],
    },
    {
      code: '!a in b',
      errors: [{ message: "Unexpected negating the left operand of 'in' operator.", suggestions: 2 }],
    },
  ],
});
