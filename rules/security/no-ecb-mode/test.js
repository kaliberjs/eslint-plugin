const { test, merge } = require('../../../machinery/test')

test('security-no-ecb-mode', merge(
  {
    valid: [
      // Authenticated modes and CBC are not ECB.
      "crypto.createCipheriv('aes-256-gcm', key, iv)",
      "crypto.createCipheriv('aes-128-cbc', key, iv)",
      // Algorithm from a variable: known false negative.
      'crypto.createCipheriv(algorithm, key, iv)',
    ],
    invalid: [
      {
        code: "crypto.createCipheriv('aes-256-ecb', key, null)",
        errors: [{ messageId: 'ecbAlgorithm' }],
      },
      {
        code: "crypto.createDecipheriv('AES-128-ECB', key, null)",
        errors: [{ messageId: 'ecbAlgorithm' }],
      },
      {
        // Deprecated passphrase-based constructor, MD5 key derivation.
        code: "crypto.createCipher('aes-256-cbc', password)",
        errors: [{ messageId: 'createCipher' }],
      },
      {
        code: 'CryptoJS.AES.encrypt(data, key, { mode: CryptoJS.mode.ECB })',
        errors: [{ messageId: 'ecbMode' }],
      },
    ],
  },

  {
    valid: [],
    invalid: [],
  },
))
