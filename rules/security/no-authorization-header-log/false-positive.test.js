const { test, merge } = require('../../../machinery/test')

test('security-no-authorization-header-log', merge(
  {
    valid: [
      'function h(req) { console.log(req.query) }',
    ],
    invalid: [],
  },

  { valid: [], invalid: [] },
))
