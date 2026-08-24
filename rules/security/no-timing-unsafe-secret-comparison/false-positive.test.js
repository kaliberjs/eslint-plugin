const { test, merge } = require('../../../machinery/test')

test('security-no-timing-unsafe-secret-comparison', merge(
  {
    valid: [
      'count === 5',
      // An existence check on a secret-shaped property, not a value
      // comparison — the member-expression scope limit keeps this quiet.
      'user.token === undefined',
    ],
    invalid: [],
  },

  { valid: [], invalid: [] },
))
