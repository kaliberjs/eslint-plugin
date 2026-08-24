const { test, merge } = require('../../../machinery/test')

test('security-no-md5', merge(
  {
    valid: [
      "crypto.createHash('sha256')",
      // Not statically foldable: a documented miss, not a crash.
      'crypto.createHash(algFromConfig)',
    ],
    invalid: [],
  },

  { valid: [], invalid: [] },
))
