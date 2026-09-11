const { test, merge } = require('../../../machinery/test')

test('security-no-xxe', merge(
  {
    valid: [
      // Defaults are safe: entities off.
      'libxmljs.parseXml(xml)',
      'libxmljs.parseXml(xml, { dtdload: false })',
      // Options from config cannot be judged.
      'parseXml(xml, options)',
    ],
    invalid: [
      {
        code: 'libxmljs.parseXml(xml, { noent: true, dtdload: true })',
        errors: [
          { messageId: 'entityExpansion' },
          { messageId: 'entityExpansion' },
        ],
      },
      {
        code: 'parseString(body, { noent: true })',
        errors: [{ messageId: 'entityExpansion' }],
      },
    ],
  },

  {
    valid: [],
    invalid: [],
  },
))
