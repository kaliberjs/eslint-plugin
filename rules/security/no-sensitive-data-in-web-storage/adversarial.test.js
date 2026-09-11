const { test, merge } = require('../../../machinery/test')

/**
 * Adversarial corpus for no-sensitive-data-in-web-storage.
 *
 * Was a miss, now fixed: setItem's key argument only checked an inline
 * string Literal, so a no-substitution template literal or a const alias
 * (`const KEY = 'authToken'; localStorage.setItem(KEY, token)`) was
 * invisible. Fixed by folding through getStaticValue.
 */
test('security-no-sensitive-data-in-web-storage', merge(
  {
    valid: [],
    invalid: [
      {
        code: 'localStorage.setItem(`authToken`, token)',
        errors: [{ messageId: 'credentialInStorage' }],
      },
      {
        code: "const KEY = 'authToken'; localStorage.setItem(KEY, token)",
        errors: [{ messageId: 'credentialInStorage' }],
      },
    ],
  },

  { valid: [], invalid: [] },
))
