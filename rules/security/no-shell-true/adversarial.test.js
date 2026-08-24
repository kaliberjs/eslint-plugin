const { test, merge } = require('../../../machinery/test')

/**
 * Adversarial corpus for no-shell-true.
 *
 * Was a miss, now fixed: the value check required an inline Literal node,
 * so a const alias (`const SH = true; spawn(cmd, args, { shell: SH })`) was
 * invisible. Fixed by folding through getStaticValue, and the key match
 * switched to the shared getStaticPropertyName helper for the same
 * computed/string-literal-key coverage already applied elsewhere.
 */
test('security-no-shell-true', merge(
  {
    valid: [],
    invalid: [
      {
        code: 'const SH = true; spawn(cmd, args, { shell: SH })',
        errors: [{ messageId: 'shellTrue' }],
      },
      {
        code: "spawn(cmd, args, { ['shell']: true })",
        errors: [{ messageId: 'shellTrue' }],
      },
    ],
  },

  { valid: [], invalid: [] },
))
