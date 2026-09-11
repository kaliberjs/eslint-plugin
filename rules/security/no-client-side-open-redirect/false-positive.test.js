const { test, merge } = require('../../../machinery/test')
const { browser } = require('globals')

const withBrowser = tests => tests.map(t => ({
  ...(typeof t === 'string' ? { code: t } : t),
  languageOptions: { globals: browser },
}))

/**
 * False-positive corpus for no-client-side-open-redirect.
 *
 * One confirmed false positive is pinned as currently-reported rather than
 * hidden (the CLEAN/WAS FAILING split used by no-sql-injection's corpus):
 * the origin-equality guard is the rule's own documented remediation, and
 * it still fires. Root cause: `location.origin` resolves as tainted. Not
 * through a source registered for `.origin` specifically, but because
 * `location` itself is a registered source with an empty path (needed so a
 * bare `location` reference — e.g. `String(location)` — stays tainted),
 * and the generic "reading a property off a tainted value stays tainted"
 * rule then applies uniformly to every property, including the ones that
 * describe the *current* page rather than attacker input: `origin`,
 * `host`, `hostname`, `protocol`, `port`.
 *
 * This is not a one-line fix. Excluding those properties globally via
 * `nonPropagatingProperties` would silently stop tracking a different,
 * real vulnerability: `new URL(fullyAttackerControlledString).origin` is
 * genuinely attacker-influenced, and the same property names mean the
 * opposite thing on that receiver. A correct fix needs the exclusion to be
 * receiver-aware, which the registry does not currently model. Left as a
 * confirmed, root-caused, open finding rather than a quick patch that
 * trades one false positive for a false negative elsewhere.
 */
test('security-no-client-side-open-redirect', merge(
  {
    // --- CLEAN — regression tests -------------------------------------
    valid: [
      ...withBrowser([
        'location.href = "/dashboard"',
        'router.push("/dashboard")',
        'window.open("https://docs.example.com", "_blank")',
        // Non-navigation property assignment on an unrelated object.
        'link.href = location.hash',
      ]),
    ],
    invalid: [],
  },

  {
    // --- WAS FAILING — documented, not hidden ---------------------------
    valid: [],
    invalid: [
      ...withBrowser([
        {
          // The origin-equality guard the rule's own message recommends.
          // See the file header for why this is not yet fixed.
          code: "const next = new URLSearchParams(location.search).get('next'); const url = new URL(next, location.origin); if (url.origin === location.origin) location.href = url.href",
          errors: [{ messageId: 'clientOpenRedirect' }],
        },
      ]),
    ],
  },
))
