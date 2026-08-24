const { test, merge } = require('../../../machinery/test')

const handler = code => `function handler(req, res) { ${code} }`

test('security-no-insecure-cookie-flags', merge(
  {
    valid: [
      // All three flags present and sane.
      handler("res.cookie('sessionId', id, { secure: true, httpOnly: true, sameSite: 'lax' })"),
      // Non-session cookies are legitimately script-readable and insecure;
      // flagging them was scored as the noise that kills this rule.
      handler(`res.cookie('theme', 'dark')`),
      handler(`res.cookie('csrfToken', token, { httpOnly: false })`),
      // Cookie name from a variable cannot be judged.
      handler(`res.cookie(name, value, {})`),
      // Receiver-constrained: not a response object.
      `jar.cookie('sessionId', value)`,
    ],
    invalid: [
      {
        code: handler(`res.cookie('sessionId', id)`),
        errors: [{ messageId: 'insecureCookie' }],
      },
      {
        code: handler(`res.cookie('auth_token', token, { secure: false, httpOnly: true })`),
        errors: [{ messageId: 'insecureCookie' }],
      },
      {
        code: handler(`res.cookie('sid', id, { httpOnly: false })`),
        errors: [{ messageId: 'insecureCookie' }],
      },
      {
        code: handler(`res.cookie('session', id, { sameSite: 'none', secure: false })`),
        errors: [{ messageId: 'insecureCookie' }],
      },
    ],
  },

  {
    valid: [],
    invalid: [],
  },
))
