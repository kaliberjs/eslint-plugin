const { test, merge } = require('../../../machinery/test')

/**
 * Adversarial corpus for no-target-blank-without-noopener.
 *
 * Was a miss, now fixed: window.open's features argument required an
 * inline Literal, so a const alias (`const opts = 'width=500'; window.
 * open(url, name, opts)`) fell through silently — neither the "no features
 * at all" branch nor the "features lacks noopener" branch matched.
 * Fixed by folding through getStaticValue.
 */
test('security-no-target-blank-without-noopener', merge(
  {
    valid: [],
    invalid: [
      {
        code: "const opts = 'width=500'; window.open(url, name, opts)",
        errors: [{ messageId: 'windowOpenNoopener' }],
      },
    ],
  },

  { valid: [], invalid: [] },
))
