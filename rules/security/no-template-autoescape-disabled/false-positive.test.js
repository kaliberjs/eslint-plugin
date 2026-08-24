const { test, merge } = require('../../../machinery/test')

test('security-no-template-autoescape-disabled', merge(
  {
    valid: [
      'nunjucks.configure({ autoescape: true })',
      'const config = { timeout: 5000 }',
    ],
    invalid: [],
  },

  { valid: [], invalid: [] },
))
