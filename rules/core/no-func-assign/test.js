const { RuleTester } = require('eslint')
const { builtinRules } = require('eslint/use-at-your-own-risk');
const rule = builtinRules.get('no-func-assign');
const { test } = require('node:test')

test('no-func-assign', () => {
  const ruleTester = new RuleTester({ languageOptions: { ecmaVersion: 2020 } })

  ruleTester.run('no-func-assign', rule, {
    valid: [
      'var a = function() {}; a = 1;',
      'function a() { var a = 1; }',
      'var a = function() { a = 1; };',
    ],
    invalid: [
      {
        code: 'function a() {}; a = 1;',
        errors: [{ message: "'a' is a function." }],
      },
      {
        code: 'function a() {}; [a] = [1];',
        errors: [{ message: "'a' is a function." }],
      },
    ],
  })
})
