const { test, merge } = require('../../../machinery/test')

test('security-no-javascript-url', merge(
  {
    valid: [
      '<a href="/about">go</a>',
    ],
    invalid: [],
  },

  { valid: [], invalid: [] },
))
