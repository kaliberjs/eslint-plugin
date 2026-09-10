const { test, merge } = require('../../../machinery/test')

test('security-no-plain-http-url', merge(
  {
    valid: [
      "fetch('https://api.example.com/v1/users')",
      // Localhost is the documented development escape hatch.
      "fetch('http://localhost:3000/health')",
      "new WebSocket('ws://127.0.0.1:8080')",
      'fetch(url)',
      // A string that merely appears somewhere harmless.
      `logger.info('see http://docs.example.com for details')`,
    ],
    invalid: [
      {
        // The message interpolates the scheme. It read "'undefined' endpoint"
        // for every http:// URL until a dogfood run caught it, because no test
        // had ever asserted the rendered text.
        code: "fetch('http://api.example.com/v1/users')",
        errors: [{ messageId: 'cleartextRequest', data: { scheme: 'http' } }],
      },
      {
        code: "axios.get('http://internal.example.com/payments')",
        errors: [{ messageId: 'cleartextRequest' }],
      },
      {
        code: "new WebSocket('ws://feed.example.com/prices')",
        errors: [{ messageId: 'cleartextRequest', data: { scheme: 'ws' } }],
      },
      {
        code: "http.request({ url: 'http://api.example.com/x' })",
        errors: [{ messageId: 'cleartextRequest' }],
      },
    ],
  },

  {
    valid: [],
    invalid: [],
  },
))
