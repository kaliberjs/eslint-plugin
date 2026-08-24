const { test, merge } = require('../../../machinery/test')

/**
 * Adversarial corpus for no-static-iv.
 *
 * Two misses, now fixed: the IV-value check recognized only an inline
 * Literal or an inline Buffer.from/alloc(literal), so a const alias of
 * either shape was invisible — including the stacked case, a const alias
 * *of* a Buffer.from(literal) call, which needed one extra hop through the
 * variable's initializer since getStaticValue does not evaluate Buffer
 * calls itself. The crypto-js `iv` option key had the same computed/
 * string-literal-key gap already found in no-ecb-mode.
 */
test('security-no-static-iv', merge(
  {
    valid: [],
    invalid: [
      {
        code: "const IV = 'fixed12345678901'; crypto.createCipheriv(alg, key, IV)",
        errors: [{ messageId: 'staticIv' }],
      },
      {
        code: "const IV = Buffer.from('fixed12345678901'); crypto.createCipheriv(alg, key, IV)",
        errors: [{ messageId: 'staticIv' }],
      },
      {
        code: "CryptoJS.AES.encrypt(data, key, { 'iv': 'static' })",
        errors: [{ messageId: 'staticIv' }],
      },
    ],
  },

  { valid: [], invalid: [] },
))
