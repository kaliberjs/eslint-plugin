const { test, merge } = require('../../../machinery/test')

test('security-no-hardcoded-api-key', merge(
  {
    valid: [
      'const key = process.env.OPENAI_KEY',
      'const template = `some normal template ${value}`',
      'const notAKey = `just a regular sentence with no secrets`',
    ],
    invalid: [],
  },

  { valid: [], invalid: [] },
))
