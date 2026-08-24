const { test, merge } = require('../../../machinery/test')

test('security-no-insecure-cookie-flags', merge(
  {
    valid: [
      "res.cookie('session', id, { secure: true, httpOnly: true, sameSite: 'lax' })",
      // Not a session/auth-shaped cookie name.
      "res.cookie('theme', 'dark', {})",
    ],
    invalid: [],
  },

  { valid: [], invalid: [] },
))
