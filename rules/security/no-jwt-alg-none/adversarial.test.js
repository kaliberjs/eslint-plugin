const { test, merge } = require('../../../machinery/test')

/**
 * Adversarial corpus for no-jwt-alg-none.
 *
 * Was a miss, now fixed: the value check only recognized an inline Literal
 * or TemplateLiteral, so a const alias for 'none' was invisible. Fixed by
 * folding through getStaticValue instead of checking node types by hand,
 * which also folds an array of const aliases the same way.
 */
test('security-no-jwt-alg-none', merge(
  {
    valid: [],
    invalid: [
      {
        code: "const NONE = 'none'; jwt.verify(token, key, { algorithm: NONE })",
        errors: [{ messageId: 'algNone' }],
      },
      {
        code: "const NONE = 'none'; jwt.verify(token, key, { algorithms: [NONE, 'RS256'] })",
        errors: [{ messageId: 'algNone' }],
      },
    ],
  },

  { valid: [], invalid: [] },
))
