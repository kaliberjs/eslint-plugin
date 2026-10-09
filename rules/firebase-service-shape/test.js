const { test } = require('../../machinery/test')

// Written reductions of the rules-file shapes; no client code. A service's own record, as in a
// job-alert subscription the service and the server write.
const helpers = `
function validate(x) { return { '.validate': x } }
function isString() { return validate('newData.isString()') }
const isSubscriptionService = "(auth.uid === 'subscription-service')"
const isSite = "(auth.uid === 'serve')"
`

test('firebase-service-shape', {
  valid: [
    {
      name: 'a service record closed and shaped',
      code: `${helpers}
module.exports = () => ({ rules: { jobAlert: { subscribed: { $subscriptionId: {
  '.write': \`\${isSubscriptionService} || \${isSite}\`,
  '.validate': 'newData.hasChildren()',
  language: isString(),
  formValues: {
    email: isString(), '$other': validate(false), '.validate': 'newData.hasChildren()',
  },
  '$other': validate(isSubscriptionService),
} } } } })`,
    },
    {
      name: 'a record with its own .validate, as a subscription the service and server write',
      code: `${helpers}
module.exports = () => ({ rules: { jobAlert: { unconfirmed: { $subscriptionId: {
  '.write': \`\${isSubscriptionService} || \${isSite}\`,
  '.validate': \`\${isSubscriptionService} || (\${isSite} && !newData.exists())\`,
  language: isString(),
  '$other': validate(isSubscriptionService),
} } } } })`,
    },
    {
      name: 'data users write is left to the rules for users',
      code: `${helpers}
module.exports = () => ({ rules: { queue: { $key: {
  '.write': 'auth != null && newData.exists() && !data.exists()', email: isString(),
} } } })`,
    },
  ],
  invalid: [
    {
      name: 'a status node a service writes, neither closed nor shaped',
      code: `${helpers}
module.exports = () => ({ rules: { services: { 'subscription-service': { status: { $host: {
  '.write': isSubscriptionService,
  lastRun: isString(),
} } } } } })`,
      // Both fixes insert at the same place: one per pass, --fix runs passes until both are in.
      output: `${helpers}
module.exports = () => ({ rules: { services: { 'subscription-service': { status: { $host: {
  '.write': isSubscriptionService,
  lastRun: isString(),
  '$other': validate(isSubscriptionService),
} } } } } })`,
      errors: [{ messageId: 'otherRequired' }, { messageId: 'childrenRequired' }],
    },
    {
      name: 'data inside a service record opened to the service',
      code: `${helpers}
module.exports = () => ({ rules: { services: { 'subscription-service': { status: { $host: {
  '.write': isSubscriptionService,
  '.validate': 'newData.hasChildren()',
  lastRun: isString(),
  details: {
    reason: isString(),
    '$other': validate(isSubscriptionService),
    '.validate': 'newData.hasChildren()',
  },
  '$other': validate(isSubscriptionService),
} } } } } })`,
      output: `${helpers}
module.exports = () => ({ rules: { services: { 'subscription-service': { status: { $host: {
  '.write': isSubscriptionService,
  '.validate': 'newData.hasChildren()',
  lastRun: isString(),
  details: {
    reason: isString(),
    '$other': validate(false),
    '.validate': 'newData.hasChildren()',
  },
  '$other': validate(isSubscriptionService),
} } } } } })`,
      errors: [{ messageId: 'otherClosed' }],
    },
  ],
})
