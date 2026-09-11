const { test, merge } = require('../../../machinery/test')

test('security-no-jwt-algorithm-confusion', merge(
  {
    valid: [
      "const { jwtVerify } = require('jose'); jwtVerify(token, key, { algorithms: ['RS256'] })",
      // Unrelated receiver name: no plausible JWT root.
      'myCustomThing.verify(token, key)',
      // A local function named verify, not imported from anywhere.
      'function verify(x) { return x } verify(token)',
    ],
    invalid: [],
  },

  { valid: [], invalid: [] },
))
