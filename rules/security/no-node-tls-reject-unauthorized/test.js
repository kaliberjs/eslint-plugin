const { test, merge } = require('../../../machinery/test')

test('security-no-node-tls-reject-unauthorized', merge(
  {
    // --- the exact assignment, both spellings -----------------------------
    invalid: [
      {
        code: "process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'",
        errors: [{ messageId: 'tlsRejectUnauthorized' }],
      },
      {
        code: 'process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0',
        errors: [{ messageId: 'tlsRejectUnauthorized' }],
      },
      {
        code: "process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0'",
        errors: [{ messageId: 'tlsRejectUnauthorized' }],
      },
      {
        code: "Object.assign(process.env, { NODE_TLS_REJECT_UNAUTHORIZED: '0' })",
        errors: [{ messageId: 'tlsRejectUnauthorized' }],
      },
    ],
    valid: [],
  },

  {
    // --- not a disabling value --------------------------------------------
    valid: [
      // Explicitly re-enabling verification.
      "process.env.NODE_TLS_REJECT_UNAUTHORIZED = '1'",
      "process.env.NODE_TLS_REJECT_UNAUTHORIZED = ''",
      // Deleting the variable restores the default.
      'delete process.env.NODE_TLS_REJECT_UNAUTHORIZED',
    ],
    invalid: [],
  },

  {
    // --- known false negatives, pinned so their absence stays deliberate ---
    valid: [
      // Assigned from a variable: we cannot know what it holds at runtime,
      // and flagging every assignment to this variable would fire on the
      // legitimate re-enable case too.
      'process.env.NODE_TLS_REJECT_UNAUTHORIZED = String(process.env.INSECURE)',
      // Set outside the code ESLint sees (Dockerfile, CI, shell profile).
      'console.log("NODE_TLS_REJECT_UNAUTHORIZED=0")',
    ],
    invalid: [],
  },
))
