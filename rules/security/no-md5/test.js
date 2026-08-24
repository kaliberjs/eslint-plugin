const { test, merge } = require('../../../machinery/test')

test('security-no-md5', merge(
  {
    // --- node:crypto, both binding forms ------------------------------------
    valid: [
      // SHA-2 family is the remediation, not a finding.
      "createHash('sha256').update(data).digest('hex')",
      "crypto.createHmac('sha256', key)",
      // Algorithm from config: known false negative.
      'crypto.createHash(algorithmName)',
      // A string that merely mentions md5 is not an exact hash name.
      "logger.info('md5 migration started')",
    ],
    invalid: [
      {
        code: "const { createHash } = require('crypto'); const digest = createHash('md5').update(token).digest('hex')",
        errors: [{ messageId: 'md5Hash' }],
      },
      {
        code: "crypto.createHash('MD5').update(payload)",
        errors: [{ messageId: 'md5Hash' }],
      },
      {
        code: "crypto.createHmac('md5', secret).update(message)",
        errors: [{ messageId: 'md5Hash' }],
      },
    ],
  },

  {
    // --- crypto-js -----------------------------------------------------------
    valid: [],
    invalid: [
      {
        code: 'CryptoJS.MD5(password).toString()',
        errors: [{ messageId: 'md5Hash' }],
      },
      {
        code: 'CryptoJS.HmacMD5(message, key)',
        errors: [{ messageId: 'md5Hash' }],
      },
    ],
  },

  {
    // --- the honest false-positive family -----------------------------------
    // MD5-for-cache-keys and ETags are legitimate. The rule still reports —
    // it cannot know intent — so these pin the documented answer: a line
    // disable with a comment, not a hole in the matcher.
    valid: [],
    invalid: [
      {
        code: "const cacheKey = crypto.createHash('md5').update(url).digest('hex')",
        errors: [{ messageId: 'md5Hash' }],
      },
    ],
  },
))
