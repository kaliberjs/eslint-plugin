const { RuleTester } = require('eslint');
const rule = require('eslint/lib/rules/strict');

const ruleTester = new RuleTester();

ruleTester.run('strict', rule, {
  valid: [
    {
      code: 'function foo() { "use strict"; }',
      options: ['function'],
    },
  ],
  invalid: [
    {
      code: 'function foo() {}',
      options: ['function'],
      errors: [{ message: "Use the function form of 'use strict'." }],
    },
    {
      code: '"use strict"; function foo() {}',
      options: ['function'],
      errors: [
        { message: "Use the function form of 'use strict'." },
        { message: "Use the function form of 'use strict'." },
    ],
    }
  ],
});
