const { RuleTester } = require('eslint');
const rule = require('eslint/lib/rules/no-fallthrough');
const { test } = require('node:test');

test('no-fallthrough', () => {
  const ruleTester = new RuleTester();

  ruleTester.run('no-fallthrough', rule, {
    valid: [
      'function foo() { switch(foo) { case 1: a(); break; case 2: b(); } }',
      'function foo() { switch(foo) { case 1: a(); return; case 2: b(); } }',
      'function foo() { switch(foo) { case 1: a(); throw new Error(); case 2: b(); } }',
      'function foo() { switch(foo) { case 1: case 2: a(); break; } }',
      'function foo() { switch(foo) { case 1: // fallthrough \n case 2: a(); break; } }',
    ],
    invalid: [
      {
        code: 'function foo() { switch(foo) { case 1: a(); case 2: b() } }',
        errors: [{ message: "Expected a 'break' statement before 'case'." }],
      },
    ],
  });
});
