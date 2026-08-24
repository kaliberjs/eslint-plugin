const { test, merge } = require('../../../machinery/test')

test('security-no-ecb-mode', merge(
  {
    valid: [
      "crypto.createCipheriv('aes-256-gcm', key, iv)",
      'CryptoJS.AES.encrypt(data, key, { mode: CryptoJS.mode.CBC })',
    ],
    invalid: [],
  },

  { valid: [], invalid: [] },
))
