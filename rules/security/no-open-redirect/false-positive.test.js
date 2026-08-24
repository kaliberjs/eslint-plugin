const { test, merge } = require('../../../machinery/test')

const handler = code => `function handler(req, res) { ${code} }`

/**
 * False-positive corpus for no-open-redirect.
 */
test('security-no-open-redirect', merge(
  {
    valid: [
      // A literal redirect target is the point of a redirect.
      handler(`res.redirect('/dashboard')`),
      // Unrelated header names must not trip the Location-header spelling.
      handler(`res.setHeader('X-Reply', req.query.x)`),
      // A literal Location header value is safe regardless of how the
      // header name got there.
      handler(`res.setHeader('Location', '/dashboard')`),
      // Allowlist membership over a closed, statically foldable set —
      // the remediation the rule's own message names.
      handler(`const next = req.query.next; if (!['/a','/b'].includes(next)) return res.redirect('/a'); res.redirect(next)`),
    ],
    invalid: [],
  },

  { valid: [], invalid: [] },
))
