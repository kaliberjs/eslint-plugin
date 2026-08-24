const { test, merge } = require('../../../machinery/test')

test('security-no-hardcoded-credentials', merge(
  {
    valid: [
      'const config = { password: process.env.DB_PASSWORD }',
      'const config = { password: getPassword() }',
      // Not a connection string: no embedded credentials.
      'const url = `https://api.example.com/health`',
      // A string-literal key that is not a credential name.
      "const config = { 'timeout': 5000 }",
    ],
    invalid: [],
  },

  {
    valid: [
      // Same AST shape as express-basic-auth's users map — arbitrary keys,
      // string values — but not that call. The shape alone must never be
      // enough.
      "assignRoles({ users: { alice: 'editor', bob: 'viewer' } })",
      "const users = { alice: 'editor' }",
      // Real safe usage: vault/config-sourced, still an arbitrary username key.
      'basicAuth({ users: { admin: config.fields.basicAuth.admin } })',
    ],
    invalid: [],
  },
))
