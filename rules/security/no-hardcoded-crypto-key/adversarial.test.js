const { test, merge } = require('../../../machinery/test')

/**
 * Adversarial corpus for no-hardcoded-crypto-key.
 *
 * Was a miss, now fixed: the key-argument check only recognized an inline
 * Literal node, so a const alias (`const KEY = '...'; createHmac(a, KEY)`)
 * was invisible — the same gap already found and fixed in no-jwt-alg-none
 * and no-disabled-tls-verification. Fixed by folding through
 * getStaticValue, which also extends createSecretKey's check to the
 * Buffer.from(literal) form it was previously missing.
 */
test('security-no-hardcoded-crypto-key', merge(
  {
    valid: [],
    invalid: [
      {
        code: "const KEY = 'mysecretkey12345'; crypto.createCipheriv(alg, KEY, iv)",
        errors: [{ messageId: 'hardcodedKey' }],
      },
      {
        code: "const KEY = 'mysecretkey12345'; crypto.createHmac('sha256', KEY)",
        errors: [{ messageId: 'hardcodedKey' }],
      },
      {
        code: "crypto.createSecretKey(Buffer.from('mysecretkey12345'))",
        errors: [{ messageId: 'hardcodedKey' }],
      },
    ],
  },

  { valid: [], invalid: [] },
))
