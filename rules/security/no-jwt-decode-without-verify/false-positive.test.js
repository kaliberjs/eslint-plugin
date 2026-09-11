const { test, merge } = require('../../../machinery/test')

test('security-no-jwt-decode-without-verify', merge(
  {
    valid: [
      // verify() checks the signature — the remediation, and out of scope
      // for this rule's own concern.
      'jwt.verify(token, key, { algorithms: ["RS256"] })',
      // A same-named decode from an unrelated module.
      "const { decode } = require('some-codec-lib'); decode(buf)",
      // A local function named decode, not imported from anywhere.
      'function decode(x) { return x } decode(token)',
    ],
    invalid: [],
  },

  { valid: [], invalid: [] },
))
