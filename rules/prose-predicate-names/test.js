const { test } = require('../../machinery/test')

test('prose-predicate-names', {
  valid: [
    `function isExpired(subscription) { return subscription.age > 30 }`,
    `const hasItems = items => items.length > 0`,
    `const canSubmit = isValid(form) && hasAcceptedTerms(form)`,
    `const user = getUser()`,
    `const active = user.active`,
    `const validators = { isReady() { return true } }`,
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
      code: `const validators = { ready() { return true } }`,
      errors: [{ messageId: 'predicateName' }],
    },
    {
      code: `class User { active() { return true } }`,
      errors: [{ messageId: 'predicateName' }],
    },
  ],
})
