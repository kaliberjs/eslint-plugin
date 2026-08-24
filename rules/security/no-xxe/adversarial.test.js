const { test, merge } = require('../../../machinery/test')

/**
 * Adversarial corpus for no-xxe.
 *
 * Two misses, now fixed: the property-key check excluded every computed
 * property outright and read only `.name`, so neither a string-literal key
 * nor a computed literal key matched; the value check required an inline
 * `true` literal, missing a const alias. Both switched to the shared
 * getStaticPropertyName/getStaticValue helpers already used elsewhere.
 */
test('security-no-xxe', merge(
  {
    valid: [],
    invalid: [
      {
        code: "libxmljs.parseXml(xml, { 'noent': true })",
        errors: [{ messageId: 'entityExpansion' }],
      },
      {
        code: "libxmljs.parseXml(xml, { ['noent']: true })",
        errors: [{ messageId: 'entityExpansion' }],
      },
      {
        code: 'const YES = true; libxmljs.parseXml(xml, { noent: YES })',
        errors: [{ messageId: 'entityExpansion' }],
      },
    ],
  },

  { valid: [], invalid: [] },
))
