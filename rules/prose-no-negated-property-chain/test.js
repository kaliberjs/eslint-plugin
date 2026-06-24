const { test } = require('../../machinery/test')

test('prose-no-negated-property-chain', {
  valid: [
    `function test(user) { if (!isReady(user)) return }`,
    `function test(user) { if (!user) return }`,
    `function test(user) { if (!hasPermissions(user)) return }`,
    `function test(user) { if (!ready) return }`,
    `function test(user) { if (user.active) return }`,
    `function test(user) { if (user.active === false) return }`,
    `function test(user) { if (!user.active) return }`,
    `function test(items) { if (!items.length) return }`,
    `function test(user) { if (!user['active']) return }`,
    `function test(user) { if (!(user.active)) return }`,
    `function test(ref) { if (!ref.current) return }`,
    {
      code: `function test(user) { if (!user.active) return }`,
      options: [{ minDepth: 2 }],
    },
    {
      code: `function test(response) { if (!response.data._type) return }`,
      options: [{ minDepth: 3 }],
    },
  ],
  invalid: [
    {
      code: `function test(response) { if (!response.data._type) return }`,
      errors: [{ messageId: 'negatedPropertyChain' }],
    },
    {
      code: `function test(response) { if (!response?.data?._type) return }`,
      errors: [{ messageId: 'negatedPropertyChain' }],
    },
    {
      code: `function test(response) { if (!response.data._type) return }`,
      options: [{ minDepth: 2 }],
      errors: [{ messageId: 'negatedPropertyChain' }],
    },
    {
      code: `function test(user) { if (!user.active) return }`,
      options: [{ minDepth: 1 }],
      errors: [{ messageId: 'negatedPropertyChain' }],
    },
  ],
})
