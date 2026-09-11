const { test, merge } = require('../../../machinery/test')

test('security-no-inner-html', merge(
  {
    valid: [
      'el.innerHTML = "<b>static</b>"',
      'el.textContent = someVar',
    ],
    invalid: [],
  },

  { valid: [], invalid: [] },
))
