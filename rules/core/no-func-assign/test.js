const { RuleTester } = require('eslint')
const rule = require('eslint/lib/rules/no-func-assign')
const { test } = require('node:test')

test.skip('no-func-assign', () => {
  const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 2017 } })

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
