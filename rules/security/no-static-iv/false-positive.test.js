const { test, merge } = require('../../../machinery/test')

test('security-no-static-iv', merge(
  {
    valid: [
      'crypto.createCipheriv(alg, key, crypto.randomBytes(16))',
      'function encrypt(iv) { return crypto.createCipheriv(alg, key, iv) }',
    ],
    invalid: [],
  },

  { valid: [], invalid: [] },
))
