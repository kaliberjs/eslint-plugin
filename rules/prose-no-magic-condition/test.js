const { test } = require('../../machinery/test')

test('prose-no-magic-condition', {
  valid: [
    `if (isAdult(person)) grantAccess()`,
    `if (retries > MAX_RETRY_ATTEMPTS) throw new Error('Failed')`,
    `function test(value) { if (value == null) return }`,
    `function test(value) { if (value === undefined) return }`,
    `function test(enabled) { if (enabled === true) return }`,
    `function test(value) { if (typeof value === 'string') return }`,
    `function test(value) { if ('string' === typeof value) return }`,
    `function test(value) { if (typeof value !== 'object') return }`,
    `function test(value) { if (value instanceof HTMLElement) return }`,
    `function test(status) { if (status === ACTIVE_STATUS) return }`,
    `function test(items) { if (items.length === EMPTY_LENGTH) return }`,
    `function test(value) { if (value === null || value === undefined) return }`,
    `function test(items) { if (items.length === 0) return }`,
    `function test(items) { if (items.length > 0) return }`,
    `function test(index) { if (index === -1) return }`,
    `function test(items) { if (items.length === 1) return }`,

    // String literals ignored by default (ignoreStringLiterals: true)
    `if (user.role === 'admin') grantAccess()`,
    `if (status === 'expired' || status === 'cancelled') hideSubscription()`,
    `function test(status) { if (status === 'idle') return }`,
    `function test(role) { if (role === \`admin\`) return }`,
    `function test(status) { if (status === 'undefined') return }`,
    `const label = value === 'x' ? 'A' : 'B'`,

    {
      code: `function test(status) { if (status === 'idle' || status === 'loading') return }`,
      options: [{ allow: ['idle', 'loading'] }],
    },
    {
      code: `function test(status) { if (status === 'idle') return }`,
      options: [{ allow: ['idle'] }],
    },
    {
      code: `function test(enabled) { if (enabled === true) return }`,
      options: [{ ignoreBoolean: true }],
    },
    {
      code: `function test(value) { if (value === null) return }`,
      options: [{ ignoreNullish: true }],
    },
  ],
  invalid: [
    // Numbers — the real magic
    {
      code: `if (retries > 3) throw new Error('Failed')`,
      errors: [{ messageId: 'magicCondition' }],
    },
    {
      code: `while (attempt < 5) attempt++`,
      errors: [{ messageId: 'magicCondition' }],
    },
    {
      code: `if (discountPercentage >= 10) applyDiscount()`,
      errors: [{ messageId: 'magicCondition' }],
    },

    // Regex — still magic
    {
      code: `function test(trackingId) { if (/^cta-/.test(trackingId)) return }`,
      errors: [{ messageId: 'magicCondition' }],
    },

    // BigInt — still magic
    {
      code: `function test(count) { if (BigInt(count) > 10n) return }`,
      errors: [{ messageId: 'magicCondition' }],
    },

    // String literals — flag when ignoreStringLiterals: false
    {
      code: `if (user.role === 'admin') grantAccess()`,
      options: [{ ignoreStringLiterals: false }],
      errors: [{ messageId: 'magicCondition' }],
    },
    {
      code: `if (status === 'expired' || status === 'cancelled') hideSubscription()`,
      options: [{ ignoreStringLiterals: false }],
      errors: [
        { messageId: 'magicCondition' },
        { messageId: 'magicCondition' },
      ],
    },
    {
      code: `function test(role) { if (role === \`admin\`) return }`,
      options: [{ ignoreStringLiterals: false }],
      errors: [{ messageId: 'magicCondition' }],
    },
    {
      code: `function test(status) { if (status === 'undefined') return }`,
      options: [{ ignoreStringLiterals: false }],
      errors: [{ messageId: 'magicCondition' }],
    },

    // Other option overrides
    {
      code: `function test(enabled) { if (enabled === true) return }`,
      options: [{ ignoreBoolean: false }],
      errors: [{ messageId: 'magicCondition' }],
    },
    {
      code: `function test(value) { if (value === null) return }`,
      options: [{ ignoreNullish: false }],
      errors: [{ messageId: 'magicCondition' }],
    },
    {
      code: `function test(value) { if (typeof value === 'string') return }`,
      options: [{ ignoreTypeof: false }],
      errors: [{ messageId: 'magicCondition' }],
    },
    {
      code: `function test(items) { if (items.length === 0) return }`,
      options: [{ allowStructural: false }],
      errors: [{ messageId: 'magicCondition' }],
    },
  ],
})

