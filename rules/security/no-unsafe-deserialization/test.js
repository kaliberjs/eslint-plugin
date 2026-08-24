const { test, merge } = require('../../../machinery/test')

test('security-no-unsafe-deserialization', merge(
  {
    valid: [
      // JSON is the fix and never flagged.
      'const data = JSON.parse(payload)',
      // A fixed literal carries no attacker influence.
      "unserialize('O:8:\"stdClass\":0:{}')",
      // Unrelated method.
      'yaml.parseDocument(cfg)',
    ],
    invalid: [
      {
        code: "const serialize = require('node-serialize'); const obj = serialize.unserialize(req.body.state)",
        errors: [{ messageId: 'unsafeUnserialize' }],
      },
      {
        code: 'unserialize(userInput)',
        errors: [{ messageId: 'unsafeUnserialize' }],
      },
    ],
  },

  {
    valid: [],
    invalid: [],
  },
))
