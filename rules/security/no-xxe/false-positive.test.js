const { test, merge } = require('../../../machinery/test')

test('security-no-xxe', merge(
  {
    valid: [
      'libxmljs.parseXml(xml, { noent: false })',
      'libxmljs.parseXml(xml)',
      'const config = { timeout: 5000 }',
    ],
    invalid: [],
  },

  { valid: [], invalid: [] },
))
