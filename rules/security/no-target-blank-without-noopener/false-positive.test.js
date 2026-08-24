const { test, merge } = require('../../../machinery/test')

test('security-no-target-blank-without-noopener', merge(
  {
    valid: [
      "window.open(url, name, 'noopener')",
      "const opts = 'noopener,width=500'; window.open(url, name, opts)",
      '<a href="/x" target="_blank" rel="noopener noreferrer">x</a>',
    ],
    invalid: [],
  },

  { valid: [], invalid: [] },
))
