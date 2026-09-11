const { test, merge } = require('../../../machinery/test')
const { browser } = require('globals')

const withBrowser = tests => tests.map(t => ({
  ...(typeof t === 'string' ? { code: t } : t),
  languageOptions: { globals: browser },
}))

/**
 * Adversarial corpus for no-client-side-open-redirect.
 *
 * Two misses recorded rather than fixed — the same structural, cross-rule
 * properties already recorded for no-path-traversal, no-open-redirect and
 * no-eval: a receiver bound to a renamed variable, and .bind() indirection.
 *
 * `history.pushState`/`replaceState` (the native browser History API) is
 * deliberately not tested here as a miss: the registered `router`/`history`
 * sink targets application router libraries (React Router, Vue Router,
 * Angular Router), whose method names are `push`/`replace`, not the native
 * API's `pushState`/`replaceState`. Native History API coverage is an
 * inventory gap — a decision about what to add — not a bug in what already
 * exists, so it is out of scope for this verification pass.
 */
test('security-no-client-side-open-redirect', merge(
  {
    valid: [
      ...withBrowser([
        // ADVERSARIAL MISS: router aliased to a renamed variable before the
        // sink method is called on it.
        'const nav = router; nav.push(location.hash)',
        // ADVERSARIAL MISS: .bind() indirection.
        'const push = router.push.bind(router); push(location.hash)',
      ]),
    ],
    invalid: [
      ...withBrowser([
        // A router obtained from a hook call (the realistic Next.js/React
        // shape) is not an evasion — the receiver is matched by the local
        // variable name regardless of how it was initialized.
        {
          code: 'const router = useRouter(); router.push(location.hash)',
          errors: [{ messageId: 'clientOpenRedirect' }],
        },
      ]),
    ],
  },

  { valid: [], invalid: [] },
))
