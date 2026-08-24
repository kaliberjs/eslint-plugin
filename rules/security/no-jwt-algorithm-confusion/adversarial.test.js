const { test, merge } = require('../../../machinery/test')

/**
 * Adversarial corpus for no-jwt-algorithm-confusion.
 *
 * Was a miss, now fixed: the `algorithms` option key was matched by
 * `property.key?.name || property.key?.value` directly, missing a computed
 * literal key (`{ ['algorithms']: [...] }`). Switched to the shared
 * getStaticPropertyName helper.
 */
test('security-no-jwt-algorithm-confusion', merge(
  {
    valid: [
      "jwt.verify(token, key, { ['algorithms']: ['RS256'] })",
    ],
    invalid: [],
  },

  { valid: [], invalid: [] },
))
