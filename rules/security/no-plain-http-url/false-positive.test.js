const { test, merge } = require('../../../machinery/test')

test('security-no-plain-http-url', merge(
  {
    valid: [
      "fetch('https://api.example.com')",
      "fetch('http://localhost:3000/health')",
      'axios.get(`https://api.example.com`)',
    ],
    invalid: [],
  },

  { valid: [], invalid: [] },
))
