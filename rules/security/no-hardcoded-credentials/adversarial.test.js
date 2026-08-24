const { test, merge } = require('../../../machinery/test')

/**
 * Adversarial corpus for no-hardcoded-credentials.
 *
 * Was a miss, now fixed: the key check read `node.key?.name` directly and
 * bailed out on any computed property, so a string-literal key (valid,
 * if unusual, JS) and a computed literal key were both invisible. Switched
 * to the shared getStaticPropertyName helper.
 */
test('security-no-hardcoded-credentials', merge(
  {
    valid: [],
    invalid: [
      {
        code: "const config = { 'password': 'supersecret123' }",
        errors: [{ messageId: 'hardcodedCredential' }],
      },
      {
        code: "const config = { ['password']: 'supersecret123' }",
        errors: [{ messageId: 'hardcodedCredential' }],
      },
    ],
  },

  { valid: [], invalid: [] },
))
