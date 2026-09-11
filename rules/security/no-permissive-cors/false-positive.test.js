const { test, merge } = require('../../../machinery/test')

test('security-no-permissive-cors', merge(
  {
    valid: [
      "cors({ origin: ['https://a.example.com', 'https://b.example.com'] })",
      'cors()',
    ],
    invalid: [],
  },

  { valid: [], invalid: [] },
))
