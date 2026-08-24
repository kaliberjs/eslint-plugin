const { test, merge } = require('../../../machinery/test')

/**
 * Adversarial corpus for no-node-tls-reject-unauthorized.
 *
 * Was a miss, now fixed: `process.env.X` was matched by exact AST shape
 * (`node.object.object.name === 'process'`), so one level of local
 * indirection — `const { env } = process` or `const env = process.env` —
 * was invisible, even though destructuring `process` before reading a
 * specific variable off it is ordinary code. Fixed by resolving the
 * receiver's origin the same way JWT module resolution already does.
 */
test('security-no-node-tls-reject-unauthorized', merge(
  {
    valid: [
      // The same alias used for an unrelated variable must not be swept up
      // by the fix that resolves the real process.env origin.
      "const { env } = process; env.SOME_OTHER_VAR = '0'",
      // A variable coincidentally named `env` that is not process.env.
      "const env = { NODE_TLS_REJECT_UNAUTHORIZED: '0' }; env.NODE_TLS_REJECT_UNAUTHORIZED = '1'",
    ],
    invalid: [
      {
        code: "const { env } = process; env.NODE_TLS_REJECT_UNAUTHORIZED = '0'",
        errors: [{ messageId: 'tlsRejectUnauthorized' }],
      },
      {
        code: "const env = process.env; env.NODE_TLS_REJECT_UNAUTHORIZED = '0'",
        errors: [{ messageId: 'tlsRejectUnauthorized' }],
      },
      {
        code: "const { env } = process; Object.assign(env, { NODE_TLS_REJECT_UNAUTHORIZED: '0' })",
        errors: [{ messageId: 'tlsRejectUnauthorized' }],
      },
    ],
  },

  { valid: [], invalid: [] },
))
