const { test, merge } = require('../../../machinery/test')

test('security-no-sha1-for-security', merge(
  {
    valid: [
      "createHash('sha256').update(data).digest('hex')",
      'crypto.createHash(algorithm)',
    ],
    invalid: [
      {
        code: "createHash('sha1').update(gitObject).digest('hex')",
        errors: [{ messageId: 'sha1Hash' }],
      },
      {
        code: 'CryptoJS.SHA1(password).toString()',
        errors: [{ messageId: 'sha1Hash' }],
      },
    ],
  },

  {
    valid: [],
    invalid: [],
  },
))
