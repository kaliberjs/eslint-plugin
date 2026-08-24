const { test, merge } = require('../../../machinery/test')

test('security-no-static-iv', merge(
  {
    valid: [
      // Fresh IV per encryption — the remediation.
      "crypto.createCipheriv('aes-256-cbc', key, crypto.randomBytes(16))",
      "crypto.createDecipheriv(alg, key, iv)",
      // GCM counter nonces are an accepted pattern (documented in the inventory).
      "crypto.createCipheriv('aes-256-gcm', key, nonce)",
    ],
    invalid: [
      {
        code: "crypto.createCipheriv('aes-256-cbc', key, '0123456789abcdef')",
        errors: [{ messageId: 'staticIv' }],
      },
      {
        code: "crypto.createDecipheriv('aes-256-cbc', key, Buffer.from('0123456789abcdef'))",
        errors: [{ messageId: 'staticIv' }],
      },
      {
        code: "CryptoJS.AES.encrypt(data, key, { iv: 'fixediv' })",
        errors: [{ messageId: 'staticIv' }],
      },
    ],
  },

  { valid: [], invalid: [] },
))
