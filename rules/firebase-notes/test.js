const { test } = require('../../machinery/test')

// Written reductions of the rules-file shapes; no client code.
const helpers = `
function validate(x) { return { '.validate': x } }
const isSubscriptionService = "(auth.uid === 'subscription-service')"
`

test('firebase-notes', {
  valid: [
    {
      name: 'a trust word without rules below it',
      code: `module.exports = () => ({ rules: { stats: { verifiedCount: { '.read': true } } } })`,
    },
    {
      name: 'a service without a named check',
      code: `module.exports = () => ({ rules: { services: { mail: {
  queue: { '.write': false },
} } } })`,
    },
    {
      name: 'a plain object outside a rules file',
      code: `const user = { verified: { name: 'x' } }`,
    },
  ],
  invalid: [
    {
      name: 'a trust word with writes below it',
      code: `module.exports = () => ({ rules: { 'verified-queue': { $key: {
  '.write': 'auth != null && newData.exists() && !data.exists()',
} } } })`,
      errors: [{ messageId: 'trusted', data: { name: 'verified-queue', words: 'verified' } }],
    },
    {
      name: 'a service node with a named check',
      code: `${helpers}
module.exports = () => ({ rules: { services: { 'subscription-service': {
  '.write': isSubscriptionService,
  queue: { $key: {
    email: validate('newData.isString()'),
    '$other': validate(isSubscriptionService),
  } },
} } } })`,
      errors: [{
        messageId: 'serviceOwned',
        data: { name: 'subscription-service', check: 'isSubscriptionService' },
      }],
    },
    {
      name: 'a configured trust word',
      code: `module.exports = () => ({ rules: { approved: { '.write': "auth.uid === 'x'" } } })`,
      options: [{ words: ['approved'] }],
      errors: [{ messageId: 'trusted', data: { name: 'approved', words: 'approved' } }],
    },
  ],
})
