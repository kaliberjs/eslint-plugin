const { RuleTester } = require('eslint')
const { builtinRules } = require('eslint/use-at-your-own-risk')
const globals = require('../../../machinery/globals.json')
const rule = builtinRules.get('no-implied-eval')

// In ESLint 9 flat config, setTimeout/setInterval are not global by default.
// The rule needs browser or node globals to know about them.
const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: 2020, globals: globals.browser },
})

ruleTester.run('no-implied-eval', rule, {
  valid: [
    'setTimeout(function() { a = 1; }, 100);',
    'setInterval(function() { a = 1; }, 100);',
  ],
  invalid: [
    {
      code: 'setTimeout("a = 1;", 100);',
      errors: [{ messageId: 'impliedEval' }],
    },
    {
      code: 'setInterval("a = 1;", 100);',
      errors: [{ messageId: 'impliedEval' }],
    },
  ],
})
