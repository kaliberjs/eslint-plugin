const { test, merge } = require('../../../machinery/test')

/**
 * Adversarial corpus for no-sha1-for-security.
 *
 * Was a miss, now fixed: the same const-alias gap as no-md5 — the
 * algorithm-name check required an inline Literal. Fixed the same way,
 * folding through getStaticValue.
 */
test('security-no-sha1-for-security', merge(
  {
    valid: [],
    invalid: [
      {
        code: "const ALG = 'sha1'; crypto.createHash(ALG)",
        errors: [{ messageId: 'sha1Hash' }],
      },
    ],
  },

  { valid: [], invalid: [] },
))
