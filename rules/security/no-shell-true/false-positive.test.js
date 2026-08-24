const { test, merge } = require('../../../machinery/test')

test('security-no-shell-true', merge(
  {
    valid: [
      'spawn(cmd, args, { shell: false })',
      'spawn(cmd, args)',
      "execa(cmd, args, { shell: '' })",
    ],
    invalid: [],
  },

  { valid: [], invalid: [] },
))
