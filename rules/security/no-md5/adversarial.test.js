const { test, merge } = require('../../../machinery/test')

/**
 * Adversarial corpus for no-md5.
 *
 * Was a miss, now fixed: the algorithm-name check required an inline
 * Literal, so a const alias (`const ALG = 'md5'; crypto.createHash(ALG)`)
 * was invisible. Fixed by folding through getStaticValue.
 */
test('security-no-md5', merge(
  {
    valid: [],
    invalid: [
      {
        code: "const ALG = 'md5'; crypto.createHash(ALG)",
        errors: [{ messageId: 'md5Hash' }],
      },
    ],
  },

  { valid: [], invalid: [] },
))
