const { test, merge } = require('../../../machinery/test')

test('security-no-node-tls-reject-unauthorized', merge(
  {
    valid: [
      "process.env.NODE_TLS_REJECT_UNAUTHORIZED = '1'",
      // An unrelated env var through the same destructured binding.
      "const { env } = process; env.SOME_OTHER_VAR = '0'",
      // A variable coincidentally named `env` that is not process.env.
      "const env = { NODE_TLS_REJECT_UNAUTHORIZED: '0' }; env.NODE_TLS_REJECT_UNAUTHORIZED = '1'",
    ],
    invalid: [],
  },

  { valid: [], invalid: [] },
))
