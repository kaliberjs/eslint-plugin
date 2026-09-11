const { test, merge } = require('../../../machinery/test')

/**
 * Adversarial corpus for no-ecb-mode.
 *
 * Two misses, now fixed: the cipher algorithm argument had the same
 * const-alias gap as no-des-3des/no-md5/no-sha1-for-security; the
 * crypto-js `mode` option key excluded every computed property and read
 * only `.name`, missing a string-literal key. Both switched to the shared
 * getStaticValue/getStaticPropertyName helpers.
 */
test('security-no-ecb-mode', merge(
  {
    valid: [],
    invalid: [
      {
        code: "const ALG = 'aes-128-ecb'; crypto.createCipheriv(ALG, key, iv)",
        errors: [{ messageId: 'ecbAlgorithm' }],
      },
      {
        code: "CryptoJS.AES.encrypt(data, key, { 'mode': CryptoJS.mode.ECB })",
        errors: [{ messageId: 'ecbMode' }],
      },
    ],
  },

  { valid: [], invalid: [] },
))
