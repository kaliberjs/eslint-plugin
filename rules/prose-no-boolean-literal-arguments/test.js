const { test } = require('../../machinery/test')

test('prose-no-boolean-literal-arguments', {
  valid: [
    `fetchUser(id, { includeInactive: true })`,
    `setEnabled(isEnabled)`,
    `new Toggle({ checked: false })`,
    {
      code: `Boolean(true)`,
      options: [{ allowCallees: ['Boolean'] }],
    },
  ],
  invalid: [
    {
      code: `fetchUser(id, true)`,
      errors: [{ messageId: 'booleanLiteralArgument' }],
    },
    {
      code: `fetchUser(id, true, false)`,
      errors: [
        { messageId: 'booleanLiteralArgument' },
        { messageId: 'booleanLiteralArgument' },
      ],
    },
    {
      code: `new Toggle(false)`,
      errors: [{ messageId: 'booleanLiteralArgument' }],
    },
  ],
})
