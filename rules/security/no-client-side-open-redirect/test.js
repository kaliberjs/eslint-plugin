const { test, merge } = require('../../../machinery/test')
const { browser } = require('globals')

const withBrowser = tests => tests.map(t => ({
  ...(typeof t === 'string' ? { code: t } : t),
  languageOptions: { globals: browser },
}))

test('security-no-client-side-open-redirect', merge(
  {
    valid: [
      ...withBrowser([
        // Internal path from a constant is fine; from a query param it flags below.
        'location.href = "/home"',
        // Reading without navigating is not navigation.
        'const current = location.href',
        // Non-location href assignment (a link element) is not page navigation.
        'link.href = location.hash',
      ]),
    ],
    invalid: [
      ...withBrowser([
        {
          code: 'location.href = new URLSearchParams(location.search).get("next")',
          errors: [{ messageId: 'clientOpenRedirectQualified' }],
        },
        {
          code: 'location.assign(location.hash.slice(1))',
          errors: [{ messageId: 'clientOpenRedirect' }],
        },
        {
          code: 'window.open(document.URL)',
          errors: [{ messageId: 'clientOpenRedirect' }],
        },
        {
          code: 'router.push(new URLSearchParams(location.search).get("returnTo"))',
          errors: [{ messageId: 'clientOpenRedirectQualified' }],
        },
        {
          code: 'window.location = location.search.split("to=")[1]',
          errors: [{ messageId: 'clientOpenRedirect' }],
        },
      ]),
    ],
  },

  { valid: [], invalid: [] },
))
