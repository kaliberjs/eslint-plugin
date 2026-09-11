const { test, merge } = require('../../../machinery/test')

test('security-no-hardcoded-crypto-key', merge(
  {
    valid: [
      'crypto.createCipheriv(alg, process.env.KEY, iv)',
      "crypto.createHmac('sha256', getKeyFromVault())",
      // The key argument is a parameter, not a literal.
      'function encrypt(key, iv) { return crypto.createCipheriv(alg, key, iv) }',
    ],
    invalid: [],
  },

  { valid: [], invalid: [] },
))
