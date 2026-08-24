const { test, merge } = require('../../../machinery/test')

test('security-no-des-3des', merge(
  {
    valid: [
      // Modern ciphers are the point of the rule, not findings.
      "crypto.createCipheriv('aes-256-gcm', key, iv)",
      "crypto.createCipheriv('chacha20-poly1305', key, iv)",
      // A variable holding the algorithm cannot be judged.
      'crypto.createCipheriv(algorithmName, key, iv)',
    ],
    invalid: [
      {
        code: "crypto.createCipheriv('des-ede3-cbc', key, iv)",
        errors: [{ messageId: 'weakAlgorithm' }],
      },
      {
        code: "crypto.createCipheriv('DES', key, iv)",
        errors: [{ messageId: 'weakAlgorithm' }],
      },
      {
        code: "crypto.createDecipheriv('rc4', key, '')",
        errors: [{ messageId: 'weakAlgorithm' }],
      },
      {
        code: "crypto.createCipheriv('bf-cbc', key, iv)",
        errors: [{ messageId: 'weakAlgorithm' }],
      },
      {
        code: 'CryptoJS.TripleDES.encrypt(data, key)',
        errors: [{ messageId: 'cryptoJsWeakCipher' }],
      },
      {
        code: 'CryptoJS.DES.decrypt(data, key)',
        errors: [{ messageId: 'cryptoJsWeakCipher' }],
      },
    ],
  },

  {
    valid: [
      // Decrypt-only legacy migration paths are flagged too; this pins that
      // they are — the interop escape hatch is disabling the rule on that
      // line, not a hole in the matcher. (Pinned as invalid below.)
    ],
    invalid: [
      {
        code: 'const plaintext = CryptoJS.RC4.decrypt(ciphertext, key).toString(CryptoJS.enc.Utf8)',
        errors: [{ messageId: 'cryptoJsWeakCipher' }],
      },
    ],
  },
))
