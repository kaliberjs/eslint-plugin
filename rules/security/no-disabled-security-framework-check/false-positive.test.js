const { test, merge } = require('../../../machinery/test')

test('security-no-disabled-security-framework-check', merge(
  {
    valid: [
      'helmet({ contentSecurityPolicy: true })',
      'new BrowserWindow({ webPreferences: { nodeIntegration: false, contextIsolation: true } })',
      'helmet()',
    ],
    invalid: [],
  },

  { valid: [], invalid: [] },
))
