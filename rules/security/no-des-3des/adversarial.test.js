const { test, merge } = require('../../../machinery/test')

/**
 * Adversarial corpus for no-des-3des.
 *
 * Was a miss, now fixed: the same const-alias gap as no-md5 and
 * no-sha1-for-security, this time on the cipher algorithm argument.
 */
test('security-no-des-3des', merge(
  {
    valid: [],
    invalid: [
      {
        code: "const ALG = 'des-cbc'; crypto.createCipheriv(ALG, key, iv)",
        errors: [{ messageId: 'weakAlgorithm' }],
      },
    ],
  },

  { valid: [], invalid: [] },
))
