const { RuleTester } = require('eslint')
const { builtinRules } = require('eslint/use-at-your-own-risk')
const rule = builtinRules.get('no-global-assign')
const { test } = require('node:test')
const globals = require('globals')

test('no-global-assign', () => {
  const ruleTester = new RuleTester({
    languageOptions: {
      globals: {
        ...globals.browser,
        window: 'writable',
      },
    },
  })

  ruleTester.run('no-global-assign', rule, {
    valid: [
      'window = 1;',
    ],
    invalid: [
      {
        code: 'Object = 1;',
        errors: [{ message: "Read-only global 'Object' should not be modified." }],
      },
      {
        code: 'top = 1;',
        errors: [{ message: "Read-only global 'top' should not be modified." }],
      },
    ],
  })
})
