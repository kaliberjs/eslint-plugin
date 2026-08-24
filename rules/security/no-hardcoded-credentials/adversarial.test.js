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

  {
    // --- express-basic-auth's users map ---------------------------------
    // Recorded misses: the callee is matched by bare identifier name
    // (`basicAuth` / `expressBasicAuth`, the two spellings observed across
    // every surveyed project), the same trade-off every method/receiver-
    // name-matched sink in this plugin already accepts.
    valid: [
      // A renamed import. `const auth = require('express-basic-auth')`
      // does not match either recognised spelling.
      "const auth = require('express-basic-auth'); auth({ users: { admin: 'supersecret' } })",
      // The users object is assembled elsewhere and spread in — no
      // variable tracing, the same limitation as the wider credentials
      // family and every taint-based rule in this plugin.
      "const staticUsers = { admin: 'supersecret' }; basicAuth({ users: { ...staticUsers } })",
    ],
    invalid: [],
  },
))
