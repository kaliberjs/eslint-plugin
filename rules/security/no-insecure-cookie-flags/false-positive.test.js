const { test, merge } = require('../../../machinery/test')

test('security-no-insecure-cookie-flags', merge(
  {
    valid: [
      "res.cookie('session', id, { secure: true, httpOnly: true, sameSite: 'lax' })",
      // Not a session/auth-shaped cookie name.
      "res.cookie('theme', 'dark', {})",
      // The real shape from a Kaliber auth flow: secure, httpOnly and
      // sameSite all correctly set via cookie.serialize().
      "import * as cookie from 'cookie'; function h(v) { return cookie.serialize('sessionId', v, { secure: true, httpOnly: true, sameSite: 'lax' }) }",
      // Not a session/auth-shaped name, and not the cookie package either.
      "import * as cookie from 'cookie'; function h(v) { return cookie.serialize('theme', v) }",
      // An unrelated local variable that happens to be named `cookie` but
      // is not the npm package — must not false-fire on receiver name alone.
      "const cookie = buildCookieHelper(); function h(v) { return cookie.serialize('sessionId', v) }",
    ],
    invalid: [],
  },

  { valid: [], invalid: [] },
))
