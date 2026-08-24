const { test, merge } = require('../../../machinery/test')

test('security-no-hardcoded-crypto-key', merge(
  {
    valid: [
      // Keys from configuration.
      "crypto.createCipheriv('aes-256-gcm', keyBuffer, iv)",
      'crypto.createHmac("sha256", loadedKey)',
      'crypto.createSecretKey(randomBytes(32))',
      // Buffer.from of computed material is fine.
      'crypto.createCipheriv(alg, Buffer.from(kdf(password)), iv)',
    ],
    invalid: [
      {
        code: "crypto.createCipheriv('aes-256-cbc', '0123456789abcdef0123456789abcdef', iv)",
        errors: [{ messageId: 'hardcodedKey' }],
      },
      {
        code: "crypto.createHmac('sha256', 'signing-key-material')",
        errors: [{ messageId: 'hardcodedKey' }],
      },
      {
        code: "crypto.createSecretKey('0123456789abcdef')",
        errors: [{ messageId: 'hardcodedKey' }],
      },
      {
        // Buffer.from of a literal is the same key wearing a coat.
        code: "crypto.createCipheriv(alg, Buffer.from('deadbeefdeadbeef'), iv)",
        errors: [{ messageId: 'hardcodedKey' }],
      },
    ],
  },

  {
    valid: [],
    invalid: [],
  },
))
