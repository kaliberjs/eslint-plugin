const { test, merge } = require('../../../machinery/test')

/**
 * Adversarial corpus for no-inner-html.
 *
 * No bug to fix here: this rule already folds through getStaticValue for
 * both the sink property name (getPropertyName with a scope) and the
 * assigned value, so a const alias for either does not evade it and does
 * not falsely flag a constant. Pinned as a regression test since every
 * other rule in this batch had at least one of these two gaps.
 */
test('security-no-inner-html', merge(
  {
    valid: [
      "const H = '<b>x</b>'; el.innerHTML = H",
    ],
    invalid: [
      {
        code: 'el.innerHTML = someVar',
        errors: [{ messageId: 'htmlSink' }],
      },
    ],
  },

  { valid: [], invalid: [] },
))
