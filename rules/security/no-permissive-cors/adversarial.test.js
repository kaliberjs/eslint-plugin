const { test, merge } = require('../../../machinery/test')

/**
 * Adversarial corpus for no-permissive-cors.
 *
 * Two misses, now fixed: the `origin` option key excluded every computed
 * property and read only `.name`, missing a string-literal key; `origin:
 * true` and the wildcard/credentials header values required an inline
 * Literal, missing a const alias in each. All switched to the shared
 * getStaticPropertyName/getStaticValue helpers.
 */
test('security-no-permissive-cors', merge(
  {
    valid: [],
    invalid: [
      {
        code: "cors({ 'origin': true })",
        errors: [{ messageId: 'reflectedOrigin' }],
      },
      {
        code: 'const YES = true; cors({ origin: YES })',
        errors: [{ messageId: 'reflectedOrigin' }],
      },
    ],
  },

  { valid: [], invalid: [] },
))
