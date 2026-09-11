const { test, merge } = require('../../../machinery/test')

/**
 * Adversarial corpus for no-unsafe-deserialization.
 *
 * Was a miss, now fixed: only a bare `unserialize` name was matched, so
 * `const { unserialize: u } = require('node-serialize'); u(data)` — a
 * renamed destructure, not an unusual thing to do — evaded entirely. Fixed
 * by resolving the identifier back to its import/require origin the same
 * way no-jwt-decode-without-verify already does for a bare `decode`.
 */
test('security-no-unsafe-deserialization', merge(
  {
    valid: [
      // A renamed import from an unrelated module must not be swept up by
      // the fix that resolves the real node-serialize export — the local
      // name 'x' is not 'unserialize', so only the module-resolution path
      // could catch it, and that path requires node-serialize specifically.
      "const { parse: x } = require('some-other-lib'); x(data)",
    ],
    invalid: [
      {
        code: "const { unserialize: u } = require('node-serialize'); u(data)",
        errors: [{ messageId: 'unsafeUnserialize' }],
      },
      {
        code: "import { unserialize as u } from 'node-serialize'; u(data)",
        errors: [{ messageId: 'unsafeUnserialize' }],
      },
    ],
  },

  { valid: [], invalid: [] },
))
