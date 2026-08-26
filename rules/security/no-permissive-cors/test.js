const { test, merge, handler } = require('../../../machinery/test')

test('security-no-permissive-cors', merge(
  {
    valid: [
      // Explicit allowlist compared by equality — the remediation.
      handler(`res.setHeader('Access-Control-Allow-Origin', 'https://app.example.com')`),
      handler(`cors({ origin: ['https://a.example.com', 'https://b.example.com'] })`),
      // Wildcard WITHOUT credentials is the public-API case: info-level noise,
      // deliberately not flagged.
      handler(`cors({ origin: '*' })`),
      "require('cors')()",
      // Unrelated headers.
      handler(`res.setHeader('X-Request-Id', req.headers.origin)`),
    ],
    invalid: [
      {
        code: handler(`cors({ origin: true, credentials: true })`),
        errors: [{ messageId: 'reflectedOrigin' }],
      },
      {
        // NestJS spelling — adversarial pass find.
        code: handler(`app.enableCors({ origin: true })`),
        errors: [{ messageId: 'reflectedOrigin' }],
      },
      {
        code: handler('cors({ origin: (origin, cb) => cb(null, true) })'),
        errors: [{ messageId: 'reflectedOrigin' }],
      },
      {
        // Reflection without explicit credentials is still the dangerous shape.
        code: handler(`res.setHeader('Access-Control-Allow-Origin', req.headers.origin)`),
        errors: [{ messageId: 'reflectedOrigin' }],
      },
      {
        // Cross-statement wildcard + credentials correlation.
        code: handler(`
          res.setHeader('Access-Control-Allow-Origin', '*')
          res.setHeader('Access-Control-Allow-Credentials', 'true')
        `),
        errors: [{ messageId: 'wildcardCredentials' }],
      },
    ],
  },

  {
    valid: [],
    invalid: [],
  },
))
