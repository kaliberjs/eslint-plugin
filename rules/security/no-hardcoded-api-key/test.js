const { test, merge } = require('../../../machinery/test')

test('security-no-hardcoded-api-key', merge(
  {
    valid: [
      'openai.configure({ apiKey: process.env.OPENAI_KEY })',
      "headers['Authorization'] = `Bearer ${token}`",
      "'sk-' + suffix",                                 // not a literal key
      "'AKIA' + accessPart",
    ],
    invalid: [
      {
        code: "const AWS_KEY = 'AKIAIOSFODNN7EXAMPLE'",
        errors: [{ messageId: 'apiKeyPattern' }],
      },
      {
        code: "headers['Authorization'] = 'Bearer sk-proj9abcdefghijkmnopqrstuvwxyz123'",
        errors: [{ messageId: 'apiKeyPattern' }],
      },
      {
        code: "const signing = '-----BEGIN RSA PRIVATE KEY-----\\nMIIE...'",
        errors: [{ messageId: 'apiKeyPattern' }],
      },
      {
        code: "const slack = 'xoxb-1234567890-abcdefghijklmnop'",
        errors: [{ messageId: 'apiKeyPattern' }],
      },
    ],
  },

  { valid: [], invalid: [] },
))
