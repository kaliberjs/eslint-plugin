const { RuleTester } = require('eslint');
const rule = require('.');

const ruleTester = new RuleTester();

ruleTester.run('no-labels', rule, {
  valid: [
    'for (var i = 0; i < 10; ++i) { if (i === 5) { break; } }',
    'for (var i = 0; i < 10; ++i) { if (i === 5) { continue; } }',
  ],
  invalid: [
    {
      code: 'myLabel: for (var i = 0; i < 10; ++i) { if (i === 5) { break myLabel; } }',
      errors: [
        { message: "Unexpected labeled statement." },
        { message: "Unexpected label in break statement." },
      ],
    },
    {
      code: 'myLabel: for (var i = 0; i < 10; ++i) { if (i === 5) { continue myLabel; } }',
      errors: [
        { message: "Unexpected labeled statement." },
        { message: "Unexpected label in continue statement." },
      ],
    },
  ],
});
