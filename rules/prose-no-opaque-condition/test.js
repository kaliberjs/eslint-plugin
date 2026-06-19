const { test } = require('../../machinery/test')

test('prose-no-opaque-condition', {
  valid: [
    `function test(response) { if (isMissingDocumentType(response)) return }`,
    `function test(user) { if (!isReady(user)) return }`,
    `function test(user) { if (!user) return }`,
    `function test(user) { if (user.active) return }`,
    `function test(value) { if (value === null) return }`,
    `function test(user, form) { if (isReady(user) && canSubmit(form)) return }`,
  ],
  invalid: [
    {
      code: `function test(response) { if (!response.data._type) return }`,
      errors: [{ messageId: 'opaqueCondition' }],
    },
    {
      code: `if (daysSinceRenewal > gracePeriodDays) cancelSubscription(user)`,
      errors: [{ messageId: 'opaqueCondition' }],
    },
    {
      code: `if (user && user.role === 'admin' && user.active && !user.suspended) grantAccess()`,
      errors: [{ messageId: 'opaqueCondition' }],
    },
    {
      code: `const label = user.active && user.permissions.write ? 'yes' : 'no'`,
      errors: [{ messageId: 'opaqueCondition' }],
    },
  ],
})
