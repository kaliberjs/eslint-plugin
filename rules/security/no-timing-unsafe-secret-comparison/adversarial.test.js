const { test, merge } = require('../../../machinery/test')

/**
 * Adversarial corpus for no-timing-unsafe-secret-comparison.
 *
 * One gap recorded rather than fixed, because it is a stated design
 * decision, not an oversight: only a bare Identifier side is matched. A
 * member-expression side (`req.body.password === input`) is not, per the
 * rule's own comment — matching every `===` ending in a secret-shaped
 * property name would fire on the extremely common `x.password ===
 * undefined` existence check, which compares nothing secret at all.
 */
test('security-no-timing-unsafe-secret-comparison', merge(
  {
    valid: [
      // Deliberate scope limit, not a miss to fix.
      'req.body.password === input',
    ],
    invalid: [],
  },

  { valid: [], invalid: [] },
))
