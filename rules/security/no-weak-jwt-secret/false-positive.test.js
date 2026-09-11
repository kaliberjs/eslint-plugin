const { test, merge } = require('../../../machinery/test')

test('security-no-weak-jwt-secret', merge(
  {
    valid: [
      // The remediation: read from configuration.
      'jwt.sign(payload, process.env.JWT_SECRET)',
      'express_jwt({ secret: process.env.JWT_SECRET })',
      'express_jwt({ secretOrKey: getSecret() })',
      // Below the noise floor: too short to be a real secret.
      "jwt.sign(payload, 'abc')",
    ],
    invalid: [],
  },

  { valid: [], invalid: [] },
))
