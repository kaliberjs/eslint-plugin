const { test, merge } = require('../../../machinery/test')

test('security-no-disabled-tls-verification', merge(
  {
    valid: [
      'https.request(url, { rejectUnauthorized: true })',
      "https.request(url, { checkServerIdentity: (host, cert) => { if (host !== expected) throw new Error('bad host') } })",
      // Unrelated object entirely.
      'const config = { timeout: 5000 }',
    ],
    invalid: [],
  },

  { valid: [], invalid: [] },
))
