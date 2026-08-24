const { test, merge } = require('../../../machinery/test')

/**
 * Adversarial corpus for no-insecure-cookie-flags.
 *
 * Two misses, now fixed: the cookie-flag lookup excluded every computed
 * property and read only `.name`, missing a string-literal key; the
 * `false` check required an inline Literal, missing a const alias. Both
 * switched to the shared getStaticPropertyName/getStaticValue helpers.
 */
test('security-no-insecure-cookie-flags', merge(
  {
    valid: [],
    invalid: [
      {
        code: "res.cookie('session', id, { 'secure': false })",
        errors: [{ messageId: 'insecureCookie' }],
      },
      {
        code: "const NO = false; res.cookie('session', id, { secure: NO })",
        errors: [{ messageId: 'insecureCookie' }],
      },
    ],
  },

  { valid: [], invalid: [] },
))
