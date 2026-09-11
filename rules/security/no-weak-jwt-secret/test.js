const { test, merge } = require('../../../machinery/test')

test('security-no-weak-jwt-secret', merge(
  {
    valid: [
      // Secret from the environment — the remediation.
      'jwt.sign(payload, process.env.JWT_SECRET)',
      "jwt.verify(token, config.secret, { algorithms: ['RS256'] })",
      // Asymmetric keys are a different (also-config) concern; not literals here.
      'jwt.sign(payload, privateKey)',
      // Bare-name sign/verify are hopelessly generic — deliberately out of scope.
      "sign(payload, 'literal-secret')",
      // Not a jwt root.
      "crypto.sign('sha256', data, 'literal')",
    ],
    invalid: [
      {
        code: "jwt.sign(payload, 's3cr3t-do-not-commit')",
        errors: [{ messageId: 'hardcodedSecret' }],
      },
      {
        code: "jsonwebtoken.verify(token, 'hunter2secret')",
        errors: [{ messageId: 'hardcodedSecret' }],
      },
      {
        code: "const options = { secret: 'changeme-please' }; expressJwt(options)",
        errors: [{ messageId: 'hardcodedSecret' }],
      },
    ],
  },

  {
    valid: [],
    invalid: [],
  },
))
