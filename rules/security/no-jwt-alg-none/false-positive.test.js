const { test, merge } = require('../../../machinery/test')

test('security-no-jwt-alg-none', merge(
  {
    valid: [
      'jwt.verify(token, key, { algorithms: ["RS256", "ES256"] })',
      "jwt.verify(token, key, { algorithm: 'HS256' })",
      // A const array alias is not itself a finding — no 'none' in it.
      "const ALGS = ['RS256']; jwt.verify(token, key, { algorithms: ALGS })",
      // Not statically foldable: a documented miss, not a crash.
      'jwt.verify(token, key, { algorithms: config.allowedAlgorithms })',
    ],
    invalid: [],
  },

  { valid: [], invalid: [] },
))
