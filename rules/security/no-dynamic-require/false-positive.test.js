const { test, merge } = require('../../../machinery/test')

test('security-no-dynamic-require', merge(
  {
    valid: [
      "require('./config.json')",
      'require(`./config.json`)',
    ],
    invalid: [],
  },

  { valid: [], invalid: [] },
))
