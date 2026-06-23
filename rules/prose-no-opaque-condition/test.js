const { test } = require('../../machinery/test')

test('prose-no-opaque-condition', {
  valid: [
    `function test(response) { if (isMissingDocumentType(response)) return }`,
    `function test(user) { if (!isReady(user)) return }`,
    `function test(user) { if (!user) return }`,
    `function test(user) { if (user.active) return }`,
    `function test(value) { if (value === null) return }`,
    `function test(user, form) { if (isReady(user) && canSubmit(form)) return }`,
    `function test(value) { if (typeof value === 'string') return }`,
    `function test(value) { if ('string' === typeof value) return }`,
    `function test(value) { if (typeof value !== 'object') return }`,
    `function test(items) { for (let index = 0; index < items.length; index++) render(items[index]) }`,
    `function test(item) { while (isPending(item)) poll(item) }`,
    `function test(response) { if (response.ok) return }`,
    `function test(value) { if (value !== undefined) return }`,
    `function test(status) { if (status === ACTIVE_STATUS) return }`,
    `function test(status) { if (status === Statuses.ACTIVE) return }`,
    `function test(a, b) { if (a.count > b.count) return }`,
    `if (daysSinceRenewal > gracePeriodDays) cancelSubscription(user)`,
    {
      code: `function test(user, form, account) { if (isReady(user) && canSubmit(form) && hasAccount(account)) return }`,
      options: [{ maxNamedPredicateClauses: 3 }],
    },
    {
      code: `function test(items) { for (let index = 0; index < items.length; index++) render(items[index]) }`,
      options: [{ ignoreForLoopTests: true }],
    },
    {
      code: `function test(value) { if (typeof value === 'string') return }`,
      options: [{ ignoreTypeofComparisons: true }],
    },
    {
      code: `function test(items) { for (let index = 0; index < items.length; index++) render(items[index]) }`,
      options: [{ ignoreForLoopTests: false }],
    },
  ],
  invalid: [
    {
      code: `function test(response) { if (!response.data._type) return }`,
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
    {
      code: `function test(value) { if (typeof value === 'string') return }`,
      options: [{ ignoreTypeofComparisons: false }],
      errors: [{ messageId: 'opaqueCondition' }],
    },
    {
      code: `if (response.data && response.data._type && response.data.slug.current) render(response)`,
      errors: [{ messageId: 'opaqueCondition' }],
    },
    {
      code: `if (user.permissions.write && user.preferences.notifications.email) notify(user)`,
      errors: [{ messageId: 'opaqueCondition' }],
    },
    {
      code: `if (isReady(user) && canSubmit(form) && hasAccount(account)) submit(form)`,
      options: [{ maxNamedPredicateClauses: 2 }],
      errors: [{ messageId: 'opaqueCondition' }],
    },
    {
      code: `if (isReady(user) && canSubmit(form) && hasAccount(account) && shouldNotify(user)) submit(form)`,
      options: [{ maxNamedPredicateClauses: 3 }],
      errors: [{ messageId: 'opaqueCondition' }],
    },
    {
      code: `if (aVeryLongNameForTheCurrentUser && aVeryLongNameForTheCurrentUser.permissions.write) grantAccess()`,
      options: [{ maxLength: 40 }],
      errors: [{ messageId: 'opaqueCondition' }],
    },
  ],
})
