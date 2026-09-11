const { test, merge } = require('../../../machinery/test')

/**
 * Adversarial corpus for no-disabled-security-framework-check.
 *
 * Four misses, now fixed, the same recurring shape as every other batch
 * in this pass: the helmet flag key and the Electron webPreferences key
 * excluded every computed property and read only `.name`, missing a
 * string-literal key; both value checks required an inline Literal,
 * missing a const alias. All four switched to the shared
 * getStaticPropertyName/getStaticValue helpers.
 */
test('security-no-disabled-security-framework-check', merge(
  {
    valid: [],
    invalid: [
      {
        code: "helmet({ 'contentSecurityPolicy': false })",
        errors: [{ messageId: 'protectionDisabled' }],
      },
      {
        code: 'const OFF = false; helmet({ contentSecurityPolicy: OFF })',
        errors: [{ messageId: 'protectionDisabled' }],
      },
      {
        code: "new BrowserWindow({ webPreferences: { 'nodeIntegration': true } })",
        errors: [{ messageId: 'protectionDisabled' }],
      },
      {
        code: 'const ON = true; new BrowserWindow({ webPreferences: { nodeIntegration: ON } })',
        errors: [{ messageId: 'protectionDisabled' }],
      },
    ],
  },

  { valid: [], invalid: [] },
))
