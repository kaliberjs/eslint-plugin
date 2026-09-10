const { test, merge } = require('../../../machinery/test')

test('security-no-unsafe-deserialization', merge(
  {
    valid: [
      // JSON is the fix and never flagged.
      'const data = JSON.parse(payload)',
      // A fixed literal carries no attacker influence.
      "const { unserialize } = require('node-serialize'); unserialize('O:8:\"stdClass\":0:{}')",
      // Unrelated method.
      'yaml.parseDocument(cfg)',
      // A project's own codec that happens to share the name. This rule is in
      // the default preset at error level, so a name match alone is not enough.
      'function unserialize(input) { return JSON.parse(input) }; unserialize(userInput)',
      "const { unserialize } = require('./codec'); unserialize(userInput)",
      'const codec = { unserialize(input) { return input } }; codec.unserialize(userInput)',
      // No binding in sight: a documented miss, not a finding.
      'unserialize(userInput)',
    ],
    invalid: [
      {
        code: "const serialize = require('node-serialize'); const obj = serialize.unserialize(req.body.state)",
        errors: [{ messageId: 'unsafeUnserialize' }],
      },
      {
        code: "const { unserialize } = require('node-serialize'); unserialize(userInput)",
        errors: [{ messageId: 'unsafeUnserialize' }],
      },
      {
        code: "const { unserialize: decode } = require('node-serialize'); decode(userInput)",
        errors: [{ messageId: 'unsafeUnserialize' }],
      },
      {
        code: "import { unserialize } from 'node-serialize'; export const value = unserialize(userInput)",
        errors: [{ messageId: 'unsafeUnserialize' }],
      },
      {
        code: "import { unserialize as decode } from 'node-serialize'; export const value = decode(userInput)",
        errors: [{ messageId: 'unsafeUnserialize' }],
      },
      {
        code: "import * as serialize from 'node-serialize'; export const value = serialize.unserialize(userInput)",
        errors: [{ messageId: 'unsafeUnserialize' }],
      },
      {
        code: "const decode = require('node-serialize').unserialize; const obj = decode(userInput)",
        errors: [{ messageId: 'unsafeUnserialize' }],
      },
    ],
  },
))
