const { RuleTester } = require('eslint')
const rule = require('eslint/lib/rules/no-implied-eval')
const { test } = require('node:test')

test('no-implied-eval', () => {
  const ruleTester = new RuleTester()

  ruleTester.run('no-implied-eval', rule, {
    valid: [
      'setTimeout(function() { a = 1; }, 100);',
      'setInterval(function() { a = 1; }, 100);',
      'execScript(function() { a = 1; });',
    ],
    invalid: [
      {
        code: 'setTimeout("a = 1;", 100);',
        errors: [{ message: 'Implied eval. Consider passing a function instead of a string.' }],
      },
      {
        code: 'setInterval("a = 1;", 100);',
        errors: [{ message: 'Implied eval. Consider passing a function instead of a string.' }],
      },
      {
        code: 'execScript("a = 1;");',
        errors: [{ message: 'Implied eval. Consider passing a function instead of a string.' }],
      },
    ],
  })
})
