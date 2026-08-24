const { test, merge } = require('../../../machinery/test')

/**
 * Adversarial corpus for no-template-autoescape-disabled.
 *
 * Two misses, now fixed: the `autoescape`/`noEscape` option check excluded
 * every computed property and read only `.name`, missing a string-literal
 * key; the boolean value check required an inline Literal, missing a const
 * alias. Both switched to the shared getStaticPropertyName/getStaticValue
 * helpers already used across this codebase.
 */
test('security-no-template-autoescape-disabled', merge(
  {
    valid: [],
    invalid: [
      {
        code: "nunjucks.configure({ 'autoescape': false })",
        errors: [{ messageId: 'autoescapeDisabled' }],
      },
      {
        code: 'const OFF = false; nunjucks.configure({ autoescape: OFF })',
        errors: [{ messageId: 'autoescapeDisabled' }],
      },
    ],
  },

  { valid: [], invalid: [] },
))
