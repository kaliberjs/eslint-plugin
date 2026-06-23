const { test } = require('../../machinery/test')

test('prose-predicate-names', {
  valid: [
    `function isExpired(subscription) { return subscription.age > 30 }`,
    `const hasItems = items => items.length > 0`,
    `const canSubmit = isValid(form) && hasAcceptedTerms(form)`,
    `const user = getUser()`,
    `const active = user.active`,
    `const validators = { isReady() { return true } }`,
    `const total = price + tax`,
    `const options = context.options[0] || {}`,
    `const fallbackUser = cachedUser || getUser()`,
    `const label = status === 'active' ? 'Active' : 'Inactive'`,
    `const count = items.length`,
    `const selectedItem = isReady ? firstItem : fallbackItem`,
    `function getTotal(order) { return order.price + order.tax }`,
    `function getUserName(user) { return user.name }`,
    `function readConfig() { return config || {} }`,
    `const dimensions = width > height ? landscapeSize : portraitSize`,
    `const validators = { getReadyState() { return status } }`,
    `class User { activeState() { return this.status } }`,
    `const isReady = Boolean(state.ready)`,
    `const wasDeleted = delete record.deleted`,
    `const selectedUser = isReady(user) && getUser()`,
    {
      code: `const readyToSubmit = isReady(user)`,
      options: [{ prefixes: ['ready'] }],
    },
  ],
  invalid: [
    {
      code: `function expired(subscription) { return subscription.age > 30 }`,
      errors: [{ messageId: 'predicateName' }],
    },
    {
      code: `const valid = value => value !== null`,
      errors: [{ messageId: 'predicateName' }],
    },
    {
      code: `const ready = isReady(user)`,
      errors: [{ messageId: 'predicateName' }],
    },
    {
      code: `const submitted = isValid(form) && hasAcceptedTerms(form)`,
      errors: [{ messageId: 'predicateName' }],
    },
    {
      code: `const visible = count > 0 ? true : false`,
      errors: [{ messageId: 'predicateName' }],
    },
    {
      code: `function expiredByGracePeriod(subscription) { return subscription.age > 30 }`,
      errors: [{ messageId: 'predicateName' }],
    },
    {
      code: `function missingUser(user) { return !user }`,
      errors: [{ messageId: 'predicateName' }],
    },
    {
      code: `const enabled = Boolean(feature.enabled)`,
      errors: [{ messageId: 'predicateName' }],
    },
    {
      code: `const deleted = delete record.deleted`,
      errors: [{ messageId: 'predicateName' }],
    },
    {
      code: `const validators = { ready: () => isReady(user) }`,
      errors: [{ messageId: 'predicateName' }],
    },
    {
      code: `const validators = { ready() { return true } }`,
      errors: [{ messageId: 'predicateName' }],
    },
    {
      code: `class User { active() { return true } }`,
      errors: [{ messageId: 'predicateName' }],
    },
  ],
})
