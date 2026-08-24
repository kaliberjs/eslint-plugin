const { test, merge } = require('../../../machinery/test')

test('security-no-des-3des', merge(
  {
    valid: [
      "crypto.createCipheriv('aes-256-gcm', key, iv)",
    ],
    invalid: [],
  },

  { valid: [], invalid: [] },
))
