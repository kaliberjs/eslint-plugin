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
        code: "fetch('http://api.example.com/v1/users')",
        errors: [{ messageId: 'cleartextRequest' }],
      },
      {
        code: "axios.get('http://internal.example.com/payments')",
        errors: [{ messageId: 'cleartextRequest' }],
      },
      {
        code: "new WebSocket('ws://feed.example.com/prices')",
        errors: [{ messageId: 'cleartextRequest' }],
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
