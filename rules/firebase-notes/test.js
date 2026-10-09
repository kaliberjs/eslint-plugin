const { test } = require('../../machinery/test')

// Written reductions of the rules-file shapes; no client code.
const helpers = `
function validate(x) { return { '.validate': x } }
const isSubscriptionService = "(auth.uid === 'subscription-service')"
`

test('firebase-notes', {
  valid: [
    {
      name: 'a service without a named check',
      code: `module.exports = () => ({ rules: { services: { mail: {
  queue: { $key: { '.write': false } },
} } } })`,
    },
    {
      name: 'a service with a named check but no records',
      code: `${helpers}
module.exports = () => ({ rules: { services: { 'subscription-service': {
  lastRun: { '.write': isSubscriptionService },
} } } })`,
    },
    {
      name: 'a plain object outside a rules file',
      code: `const services = { mail: { $key: { name: 'x' } } }`,
    },
  ],
  invalid: [
    {
      name: 'a service node with a named check and records',
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
  ],
})
