const { test, merge } = require('../../../machinery/test')

test('security-no-disabled-security-framework-check', merge(
  {
    valid: [
      'app.use(helmet())',
      // Configured, not disabled — the remediation shape.
      `app.use(helmet({ contentSecurityPolicy: { directives: { defaultSrc: ["'self'"] } } }))`,
      'new BrowserWindow({ webPreferences: { contextIsolation: true, nodeIntegration: false } })',
      'app.use(express.static("public"))',
    ],
    invalid: [
      {
        code: 'app.use(helmet({ contentSecurityPolicy: false, hsts: false }))',
        errors: [
          { messageId: 'protectionDisabled' },
          { messageId: 'protectionDisabled' },
        ],
      },
      {
        code: 'new BrowserWindow({ webPreferences: { webSecurity: false, nodeIntegration: true, contextIsolation: false } })',
        errors: [
          { messageId: 'protectionDisabled' },
          { messageId: 'protectionDisabled' },
          { messageId: 'protectionDisabled' },
        ],
      },
    ],
  },

  {
    valid: [],
    invalid: [],
  },
))
