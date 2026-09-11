const { test, merge, handler } = require('../../../machinery/test')

test('security-no-open-redirect', merge(
  {
    valid: [
      // Literal targets are the point of a redirect.
      handler(`res.redirect('/dashboard')`),
      // Allowlist by equality — the remediation, and flow-sensitivity's proof.
      handler(`
        const next = req.query.next
        if (!['/dashboard', '/profile'].includes(next)) return res.redirect('/dashboard')
        res.redirect(next)
      `),
      // Unrelated header sets.
      handler(`res.setHeader('X-Reply', req.query.x)`),
    ],
    invalid: [
      {
        code: handler(`res.redirect(req.query.next)`),
        errors: [{ messageId: 'openRedirect' }],
      },
      {
        code: handler(`res.location(req.query.returnTo)`),
        errors: [{ messageId: 'openRedirect' }],
      },
      {
        code: handler("res.setHeader('Location', req.query.url)"),
        errors: [{ messageId: 'openRedirect' }],
      },
      {
        code: "import { redirect } from 'next/navigation'; function handler(req) { redirect(req.query.to) }",
        errors: [{ messageId: 'openRedirect' }],
      },
      {
        // OAuth return-URL echo.
        code: handler(`res.redirect(auth.callbackUrl + req.query.state)`),
        errors: [{ messageId: 'openRedirectQualified' }],
      },
    ],
  },

  { valid: [], invalid: [] },
))
