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

  { valid: [], invalid: [] },
))
