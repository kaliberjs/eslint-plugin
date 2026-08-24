const { test, merge } = require('../../../machinery/test')

/**
 * Adversarial corpus for no-hardcoded-api-key.
 *
 * Was a miss, now fixed: only Literal nodes were checked, so a key or PEM
 * block written as a no-substitution template literal was invisible. This
 * mattered most for PEM blocks specifically — backticks are the ordinary
 * way to get literal newlines in a multi-line key without escaping them.
 */
test('security-no-hardcoded-api-key', merge(
  {
    valid: [],
    invalid: [
      {
        code: 'const key = `AKIAABCDEFGHIJKLMNOP`',
        errors: [{ messageId: 'apiKeyPattern' }],
      },
      {
        code: 'const key = `sk-abcdefghijklmnopqrstuvwxyz1234567890`',
        errors: [{ messageId: 'apiKeyPattern' }],
      },
      {
        code: 'const key = `-----BEGIN RSA PRIVATE KEY-----\\nMIIB...\\n-----END RSA PRIVATE KEY-----`',
        errors: [{ messageId: 'apiKeyPattern' }],
      },
    ],
  },

  { valid: [], invalid: [] },
))
