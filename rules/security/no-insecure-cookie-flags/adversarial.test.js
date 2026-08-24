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

  {
    // Was a miss, now fixed: only res.cookie() was matched, so a real auth
    // flow built directly on the standalone `cookie` package — confirmed in
    // a real Kaliber project's auth-cookie code, not a hypothetical —
    // evaded entirely. Fixed by also recognizing cookie.serialize(), proven
    // to come from the `cookie` package rather than trusted by name alone.
    valid: [],
    invalid: [
      {
        code: "import * as cookie from 'cookie'; function h(v) { return cookie.serialize('sessionId', v, { httpOnly: false }) }",
        errors: [{ messageId: 'insecureCookie' }],
      },
      {
        code: "const cookie = require('cookie'); function h(v) { return cookie.serialize('authToken', v) }",
        errors: [{ messageId: 'insecureCookie' }],
      },
      // A top-level const cookie name, the ordinary way to name a cookie
      // once instead of repeating the string at every call site.
      {
        code: "import * as cookie from 'cookie'; const SESSION_COOKIE_NAME = 'sessionId'; function h(v) { return cookie.serialize(SESSION_COOKIE_NAME, v, { httpOnly: false }) }",
        errors: [{ messageId: 'insecureCookie' }],
      },
    ],
  },

  { valid: [], invalid: [] },
))
