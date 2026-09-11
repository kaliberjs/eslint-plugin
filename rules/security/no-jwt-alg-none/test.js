const { test, merge } = require('../../../machinery/test')

test('security-no-jwt-alg-none', merge(
  {
    valid: [
      // Explicit allowlist excluding none is the sanitizer.
      "jwt.verify(token, key, { algorithms: ['RS256'] })",
      "jwt.sign(payload, key, { algorithm: 'HS256' })",
      // A string that merely contains the word.
      "jwt.verify(token, key, { algorithms: ['NONE_WITH_PADDING'] })",
    ],
    invalid: [
      {
        code: "jwt.verify(token, key, { algorithms: ['none', 'RS256'] })",
        errors: [{ messageId: 'algNone' }],
      },
      {
        code: "jwt.verify(token, key, { algorithm: 'none' })",
        errors: [{ messageId: 'algNone' }],
      },
      {
        code: "const options = { algorithm: 'none' }; jwt.encode(payload, options)",
        errors: [{ messageId: 'algNone' }],
      },
      {
        code: "jwt.verify(token, key, { ['algorithms']: ['none'] })",
        errors: [{ messageId: 'algNone' }],
      },
      {
        // No-substitution template folds to the same string — adversarial find.
        code: 'jwt.verify(token, key, { algorithms: [`none`] })',
        errors: [{ messageId: 'algNone' }],
      },
    ],
  },

  {
    // Known false positive family, pinned as valid-by-design decisions:
    valid: [
      // Algorithm list built from config — a known false negative instead;
      // we do not pretend to resolve it.
      'jwt.verify(token, key, { algorithms: config.allowedAlgorithms })',
    ],
    invalid: [],
  },
))
