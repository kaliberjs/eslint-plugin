const { test, merge } = require('../../../machinery/test')

/**
 * Adversarial corpus for no-jwt-decode-without-verify.
 *
 * Was a miss, now fixed: only the member form (`jwt.decode(...)`) and a
 * fixed set of always-JWT bare names (`jwtDecode`, `decodeJwt`,
 * `decodeProtectedHeader`) were recognized. `decode` destructured out of
 * jsonwebtoken — a very ordinary way to import it — matched neither, since
 * `decode` alone is too generic to trust by name. Fixed by resolving the
 * identifier back to its import/require origin, the same proof
 * no-jwt-algorithm-confusion already requires for a bare `verify`.
 */
test('security-no-jwt-decode-without-verify', merge(
  {
    valid: [
      // A same-named decode from an unrelated module must not be swept up
      // by the same fix that resolves the real jsonwebtoken export.
      "const { decode } = require('some-codec-lib'); decode(buf)",
    ],
    invalid: [
      {
        code: "const { decode } = require('jsonwebtoken'); decode(token)",
        errors: [{ messageId: 'decodeWithoutVerify' }],
      },
      {
        code: "const { decode: d } = require('jsonwebtoken'); d(token)",
        errors: [{ messageId: 'decodeWithoutVerify' }],
      },
      {
        code: "import { decode } from 'jsonwebtoken'; decode(token)",
        errors: [{ messageId: 'decodeWithoutVerify' }],
      },
      {
        code: "import { decode as dec } from 'jose'; dec(token)",
        errors: [{ messageId: 'decodeWithoutVerify' }],
      },
    ],
  },

  { valid: [], invalid: [] },
))
