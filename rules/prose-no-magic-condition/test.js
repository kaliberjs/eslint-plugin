const { test } = require('../../machinery/test')

test('prose-no-magic-condition', {
  valid: [
    `if (isAdult(person)) grantAccess()`,
    `if (retries > MAX_RETRY_ATTEMPTS) throw new Error('Failed')`,
    `function test(value) { if (value == null) return }`,
    `function test(value) { if (value === undefined) return }`,
    `function test(enabled) { if (enabled === true) return }`,
    {
      code: `function test(status) { if (status === 'idle') return }`,
      options: [{ allow: ['idle'] }],
    },
  ],
  invalid: [
    {
      code: `if (retries > 3) throw new Error('Failed')`,
      errors: [{ messageId: 'magicCondition' }],
    },
    {
      code: `if (user.role === 'admin') grantAccess()`,
      errors: [{ messageId: 'magicCondition' }],
    },
    {
      code: `const label = value === 'x' ? 'A' : 'B'`,
      errors: [{ messageId: 'magicCondition' }],
    },
    {
      code: `while (attempt < 5) attempt++`,
      errors: [{ messageId: 'magicCondition' }],
    },
  ],
})
