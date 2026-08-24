const { test, merge } = require('../../../machinery/test')
const { browser } = require('globals')

const withBrowser = tests => tests.map(t => ({
  ...(typeof t === 'string' ? { code: t } : t),
  languageOptions: { globals: browser },
}))

// Idiomatic, legitimate code that must stay quiet. Developer trust depends
// on this: a rule that fires on the recommended-safe pattern gets disabled
// wholesale, taking the true positives down with it.
test('security-no-dom-xss-sink', merge(
  {
    valid: [
      ...withBrowser([
        // The documented remediation: an allowlist-based sanitizer clears
        // the 'html' kind, so the qualifying assignment stays quiet.
        'el.innerHTML = DOMPurify.sanitize(location.search)',
        // textContent is safe regardless of taint — it is deliberately not
        // a registered sink at all, not merely a low-severity one.
        'el.textContent = location.search',
        // Reading, not writing: no AssignmentExpression, so no sink match.
        'const current = el.innerHTML',
        'log(el.innerHTML)',
        // A template literal with only static interpolations folds to a
        // constant and never reaches the analysis.
        "el.innerHTML = `<b>${'static'}</b>`",
        // A value that never touched a registered source is not this rule's
        // concern — no-inner-html (the non-taint sibling) owns "any dynamic
        // HTML at all", this rule owns "untrusted input specifically".
        'el.innerHTML = cmsMarkup',
        'el.innerHTML = render(cmsMarkup)',
      ]),
    ],
    invalid: [],
  },

  { valid: [], invalid: [] },
))
