const { test, merge } = require('../../../machinery/test')

test('security-no-jwt-algorithm-confusion', merge(
  {
    // --- the positive obligation -------------------------------------------
    valid: [
      // Explicit allowlist: the whole point.
      "jwt.verify(token, key, { algorithms: ['RS256'] })",
      'jwt.verify(token, key, { algorithms: allowed })',
      // jose with options present (even an empty object is a deliberate
      // choice the author made — flagged only when absent entirely? no:
      // empty object lacks algorithms and IS flagged below).
      "jwtVerify(token, key, { algorithms: ['ES256'] })",
    ],
    invalid: [
      {
        code: 'jwt.verify(token, key)',
        errors: [{ messageId: 'missingAlgorithms' }],
      },
      {
        code: 'jsonwebtoken.verify(token, publicKey)',
        errors: [{ messageId: 'missingAlgorithms' }],
      },
      {
        code: 'jwtVerify(token, secretKey)',
        errors: [{ messageId: 'missingAlgorithms' }],
      },
      {
        code: "import { verify } from 'jsonwebtoken'; export function check(token) { return verify(token, key) }",
        errors: [{ messageId: 'missingAlgorithms' }],
      },
      {
        code: "const { verify } = require('jsonwebtoken'); function check(token) { return verify(token, key) }",
        errors: [{ messageId: 'missingAlgorithms' }],
      },
      {
        // Callback-only form still passes no options.
        code: 'jwt.verify(token, key, function callback(err, decoded) {})',
        errors: [{ messageId: 'missingAlgorithms' }],
      },
      {
        // Options present but algorithms explicitly absent from it.
        code: 'jwt.verify(token, key, { ignoreExpiration: true })',
        errors: [{ messageId: 'missingAlgorithms' }],
      },
      {
        // An empty options object is the same omission with extra steps.
        code: 'jwt.verify(token, key, {})',
        errors: [{ messageId: 'missingAlgorithms' }],
      },
    ],
  },

  {
    // --- what stays quiet, and why ------------------------------------------
    valid: [
      // A local verify() that does not come from a JWT module must not be
      // flagged — bare-name matching without provenance would fire on every
      // custom validator in every codebase.
      'function verify(signature, expected) { return signature === expected }; verify(sig, expected)',
      // Not a JWT root.
      'crypto.verify(algorithm, key, data)',
    ],
    invalid: [
      {
        // Options built elsewhere: the rule cannot confirm they contain an
        // algorithms list, so this is flagged by design rather than trusted.
        code: 'jwt.verify(token, key, config.jwtOptions)',
        errors: [{ messageId: 'missingAlgorithms' }],
      },
    ],
  },
))
