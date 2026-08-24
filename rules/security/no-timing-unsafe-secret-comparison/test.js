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
    ],
  },

  {
    valid: [],
    invalid: [],
  },
))
