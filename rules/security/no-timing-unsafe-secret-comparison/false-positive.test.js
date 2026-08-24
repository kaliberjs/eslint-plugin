const { test, merge } = require('../../../machinery/test')

test('security-no-timing-unsafe-secret-comparison', merge(
  {
    valid: [
      'count === 5',
      // An existence check on a secret-shaped property, not a value
      // comparison — the member-expression scope limit keeps this quiet.
      'user.token === undefined',
      // Existence/emptiness checks on a bare identifier, found as real
      // false positives in a dogfood run: hash was a URL fragment, not
      // secret material, and the check was "is one present," not a
      // comparison against an expected secret.
      "hash !== ''",
      'token === undefined',
      'token === null',
    ],
    invalid: [],
  },

  { valid: [], invalid: [] },
))
