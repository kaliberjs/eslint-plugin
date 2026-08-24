const { test, merge } = require('../../../machinery/test')

/**
 * Adversarial corpus for no-weak-jwt-secret.
 *
 * Was a miss, now fixed: the options-property check read only
 * `node.key?.name`, so a string-literal key (`{ 'secret': '...' }`) — valid
 * JS, if unusual style — was invisible; the `.name` field simply does not
 * exist on a Literal key node. Switched to the shared getStaticPropertyName
 * helper, which also now covers a computed literal key for free.
 */
test('security-no-weak-jwt-secret', merge(
  {
    valid: [],
    invalid: [
      {
        code: "express_jwt({ 'secret': 'hardcoded-secret-value' })",
        errors: [{ messageId: 'hardcodedSecret' }],
      },
      {
        code: "express_jwt({ ['secretOrKey']: 'hardcoded-secret-value' })",
        errors: [{ messageId: 'hardcodedSecret' }],
      },
    ],
  },

  { valid: [], invalid: [] },
))
