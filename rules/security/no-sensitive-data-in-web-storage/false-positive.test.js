const { test, merge } = require('../../../machinery/test')

test('security-no-sensitive-data-in-web-storage', merge(
  {
    valid: [
      "localStorage.setItem('theme', 'dark')",
      'localStorage.setItem(`theme`, "dark")',
    ],
    invalid: [],
  },

  { valid: [], invalid: [] },
))
