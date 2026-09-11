const { test, merge } = require('../../../machinery/test')

test('security-no-unsafe-deserialization', merge(
  {
    valid: [
      "unserialize('{\"a\":1}')",
      // A different export entirely, not the dangerous one.
      "const { parse } = require('node-serialize'); parse(data)",
      'JSON.parse(untrustedData)',
    ],
    invalid: [],
  },

  { valid: [], invalid: [] },
))
