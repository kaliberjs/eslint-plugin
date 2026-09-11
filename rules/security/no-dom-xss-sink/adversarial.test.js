const { test, merge } = require('../../../machinery/test')
const { browser } = require('globals')

const withBrowser = tests => tests.map(t => ({
  ...(typeof t === 'string' ? { code: t } : t),
  languageOptions: { globals: browser },
}))

// Adversarial pass: try to make untrusted input reach an HTML-parser sink
// without the rule noticing. Aliasing, destructuring, computed access, and
// same-file indirection are all attempted here because the taint engine is
// shared across every taint-based rule — an evasion proven against one
// sink family is a real risk against all of them.
test('security-no-dom-xss-sink', merge(
  {
    valid: [
      // ADVERSARIAL MISS: array literals are not a resolved expression type
      // (no ArrayExpression case in resolveByType), so a tainted element
      // inside one is invisible to any propagator that reads the receiver,
      // including .join(). String concatenation and template interpolation
      // — the common real-world shapes — are both covered below.
      ...withBrowser([
        `el.innerHTML = [location.search].join('')`,
      ]),
    ],
    invalid: [
      ...withBrowser([
        // Aliasing the sink receiver does not help: the sink is matched by
        // property name, and property sinks with no receiver constraint
        // (innerHTML/outerHTML) match regardless of what the object is.
        {
          code: 'const el2 = el; el2.innerHTML = location.search',
          errors: [{ messageId: 'domXss' }],
        },
        // Destructuring the source out of `location` still resolves: the
        // member-chain source lookup runs against the destructured binding's
        // initializer, not just direct `location.search` text.
        {
          code: 'const { search } = location; el.innerHTML = search',
          errors: [{ messageId: 'domXss' }],
        },
        // Computed property access with a statically foldable key resolves
        // through @eslint-community/eslint-utils' getPropertyName, so string
        // concatenation and a const-bound key do not evade the sink match.
        {
          code: `el['inner' + 'HTML'] = location.search`,
          errors: [{ messageId: 'domXss' }],
        },
        {
          code: `const KEY = 'innerHTML'; el[KEY] = location.search`,
          errors: [{ messageId: 'domXss' }],
        },
        // Same-file helper indirection: the interprocedural-lite summary
        // evaluates the helper's return expression with the source read
        // directly inside it, so wrapping in a same-file function is not a
        // wall.
        {
          code: 'function get() { return location.search } el.innerHTML = get()',
          errors: [{ messageId: 'domXss' }],
        },
        // Destructuring the global itself under a renamed binding.
        {
          code: 'const { location: loc } = window; el.innerHTML = loc.search',
          errors: [{ messageId: 'domXss' }],
        },
      ]),
    ],
  },

  { valid: [], invalid: [] },
))
