const { test, merge } = require('../../../machinery/test')

/**
 * Adversarial corpus for no-dynamic-require.
 *
 * One miss recorded rather than fixed: `require` itself aliased to another
 * binding (`const req = require; req(dynamicPath)`) is invisible, since the
 * check matches the callee's own name against the literal string
 * 'require'. Resolving an aliased reference to the CommonJS `require` free
 * variable specifically (not an import, not a require() result — the
 * function itself) doesn't fit the existing import/require-resolution
 * helpers used elsewhere in this codebase, and is a narrow enough pattern
 * that this verification pass records it rather than building new
 * machinery for it.
 */
test('security-no-dynamic-require', merge(
  {
    valid: [
      // ADVERSARIAL MISS: require aliased to a renamed binding.
      'const req = require; req(dynamicPath)',
    ],
    invalid: [],
  },

  { valid: [], invalid: [] },
))
