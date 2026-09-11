const { test, merge } = require('../../../machinery/test')

/**
 * Adversarial corpus for no-disabled-tls-verification.
 *
 * Two misses, now fixed: the `false` check compared `node.value.type ===
 * 'Literal' && node.value.value === false` directly, missing a const alias;
 * the property-name check read only `.name`/`.value` off the key with no
 * computed-literal handling. Both switched to shared helpers
 * (getStaticValue, getStaticPropertyName) already used elsewhere.
 */
test('security-no-disabled-tls-verification', merge(
  {
    valid: [],
    invalid: [
      {
        code: 'const NO = false; https.request(url, { rejectUnauthorized: NO })',
        errors: [{ messageId: 'verificationDisabled' }],
      },
      {
        code: "https.request(url, { ['rejectUnauthorized']: false })",
        errors: [{ messageId: 'verificationDisabled' }],
      },
    ],
  },

  { valid: [], invalid: [] },
))
