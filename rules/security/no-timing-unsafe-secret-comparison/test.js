const { test, merge } = require('../../../machinery/test')

test('security-no-timing-unsafe-secret-comparison', merge(
  {
    valid: [
      'crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b))',
      // Not secret-shaped identifiers.
      'if (a === b) { ok() }',
      'if (user.name === expectedName) {}',
      // Secret-shaped but not a comparison.
      'log(token)',
      // A URL fragment is not secret material. `hash` used to be in the name
      // pattern and this was the single largest false-positive family in the
      // dogfood run — eight of fourteen findings across sixty projects.
      "if (hash === '#section-2') scrollTo(el)",
      'const active = hash === `#${id}`',
      "if (window.location.hash === '#open') openDialog()",
      'if (currentHash === anchorId) setActive(true)',
    ],
    invalid: [
      {
        code: 'if (submittedToken === storedToken) grant()',
        errors: [{ messageId: 'timingUnsafeCompare' }],
      },
      {
        code: 'const ok = signature !== expectedSignature; assert(!ok)',
        errors: [{ messageId: 'timingUnsafeCompare' }],
      },
      {
        code: 'if (apiKey === process.env.API_KEY) allow()',
        errors: [{ messageId: 'timingUnsafeCompare' }],
      },
      {
        // A hash of a secret still carries the other half of the name.
        code: 'if (passwordHash === storedHash) grant()',
        errors: [{ messageId: 'timingUnsafeCompare' }],
      },
    ],
  },

  {
    valid: [],
    invalid: [],
  },
))
