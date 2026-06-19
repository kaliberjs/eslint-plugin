const { test } = require('../../machinery/test')

test('prose-no-negated-property-chain', {
  valid: [
    `function test(user) { if (!isReady(user)) return }`,
    `function test(user) { if (!user) return }`,
    {
      code: `function test(user) { if (!user.active) return }`,
      options: [{ minDepth: 2 }],
    },
  ],
  invalid: [
    {
      code: `function test(user) { if (!user.active) return }`,
      errors: [{ messageId: 'negatedPropertyChain' }],
    },
    {
      code: `function test(response) { if (!response.data._type) return }`,
      errors: [{ messageId: 'negatedPropertyChain' }],
    },
    {
      code: `function test(items) { if (!items.length) return }`,
      errors: [{ messageId: 'negatedPropertyChain' }],
    },
  ],
})
