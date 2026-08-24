const { test, merge } = require('../../../machinery/test')

test('security-no-sha1-for-security', merge(
  {
    valid: [
      "crypto.createHash('sha256')",
    ],
    invalid: [],
  },

  { valid: [], invalid: [] },
))
