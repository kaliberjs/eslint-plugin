const { test } = require('../../machinery/test')

// Written reductions of the rules-file shapes; no client code. The good shape follows a job-alert
// subscription: the record closed to its own service, the data inside it closed to everyone.
const helpers = `
function validate(x) { return { '.validate': x } }
function isString() { return validate('newData.isString()') }
const isSubscriptionService = "(auth.uid === 'subscription-service')"
`

test('firebase-other-required', {
  valid: [
    {
      name: 'a queue record closed to its service, the data inside it closed to everyone',
      code: `${helpers}
module.exports = () => ({ rules: { services: { 'subscription-service': { 'subscribing-queue': {
  $key: {
    '.write': 'auth != null && newData.exists() && !data.exists()',
    '.validate': 'newData.hasChildren()',
    language: isString(),
    formValues: { email: isString(), '$other': validate(false) },
    '$other': validate(isSubscriptionService),
  },
} } } } })`,
    },
    {
      name: 'a subscription record the service and site write',
      code: `${helpers}
const isSite = "(auth.uid === 'serve')"
module.exports = () => ({ rules: { jobAlert: { subscribed: { $subscriptionId: {
  '.write': \`\${isSubscriptionService} || \${isSite}\`,
  language: isString(),
  formValues: { email: isString(), '$other': validate(false) },
  '$other': validate(isSubscriptionService),
} } } } })`,
    },
    {
      name: 'a $other that does not fold gets the benefit of the doubt',
      code: `${helpers}
const { closed } = require('shared')
module.exports = () => ({ rules: { queue: { $key: { email: isString(), '$other': closed } } } })`,
    },
    {
      name: 'a shape only a service writes',
      code: `${helpers}
module.exports = () => ({ rules: { statusInfo: {
  '.write': "auth.uid === 'polling-service'", lastRun: isString(),
} } })`,
    },
    {
      name: 'a file without .validate is not a rules file',
      code: `const user = { name: 'x', email: 'y' }`,
    },
  ],
  invalid: [
    {
      name: 'a queue record without $other gets its service check',
      code: `${helpers}
module.exports = () => ({ rules: { services: { 'subscription-service': { queue: { $key: {
  '.write': 'auth != null && newData.exists() && !data.exists()',
  email: isString(),
} } } } } })`,
      output: `${helpers}
module.exports = () => ({ rules: { services: { 'subscription-service': { queue: { $key: {
  '.write': 'auth != null && newData.exists() && !data.exists()',
  email: isString(),
  '$other': validate(isSubscriptionService),
} } } } } })`,
      errors: [{ messageId: 'otherRequired', data: { path: 'services/subscription-service/queue/$key', closing: 'validate(isSubscriptionService)' } }],
    },
    {
      name: 'a record whose service has no named check is reported, not fixed',
      code: `${helpers}
module.exports = () => ({ rules: { services: { mail: { queue: { $key: {
  '.write': 'auth != null', email: isString(),
} } } } } })`,
      output: null,
      errors: [{ messageId: 'otherRequired', data: { path: 'services/mail/queue/$key', closing: 'validate(<the service that writes it>)' } }],
    },
    {
      name: 'data inside a record left open gets validate(false)',
      code: `${helpers}
module.exports = () => ({ rules: { entries: { $key: {
  '.write': 'auth != null && newData.exists()',
  formValues: { email: isString() },
  '$other': validate(false),
} } } })`,
      output: `${helpers}
module.exports = () => ({ rules: { entries: { $key: {
  '.write': 'auth != null && newData.exists()',
  formValues: { email: isString(), '$other': validate(false) },
  '$other': validate(false),
} } } })`,
      errors: [{ messageId: 'otherRequired', data: { path: 'entries/$key/formValues', closing: 'validate(false)' } }],
    },
    {
      name: 'without a validate helper the fix writes the rule object',
      code: `module.exports = () => ({ rules: { entries: { $key: {
  '.write': 'auth != null', '$other': { '.validate': false },
  formValues: { email: { '.validate': 'newData.isString()' } },
} } } })`,
      output: `module.exports = () => ({ rules: { entries: { $key: {
  '.write': 'auth != null', '$other': { '.validate': false },
  formValues: { email: { '.validate': 'newData.isString()' }, '$other': { '.validate': false } },
} } } })`,
      errors: [{ messageId: 'otherRequired', data: { path: 'entries/$key/formValues', closing: "{ '.validate': false }" } }],
    },
    {
      name: 'a $other without .validate limits nothing',
      code: `${helpers}
module.exports = () => ({ rules: { queue: { '.write': 'auth != null', $key: {
  email: isString(), '$other': { '.read': true },
} } } })`,
      output: null,
      errors: [{ messageId: 'otherRequired', data: { path: 'queue/$key', closing: 'validate(<the service that writes it>)' } }],
    },
    {
      name: 'data a client writes, opened to the service',
      code: `${helpers}
module.exports = () => ({ rules: { services: { 'subscription-service': { queue: { $key: {
  '.write': 'auth != null && newData.exists() && !data.exists()',
  filters: { jobFamily: isString(), '$other': validate(isSubscriptionService) },
  '$other': validate(isSubscriptionService),
} } } } } })`,
      output: `${helpers}
module.exports = () => ({ rules: { services: { 'subscription-service': { queue: { $key: {
  '.write': 'auth != null && newData.exists() && !data.exists()',
  filters: { jobFamily: isString(), '$other': validate(false) },
  '$other': validate(isSubscriptionService),
} } } } } })`,
      errors: [{
        messageId: 'otherClosed',
        data: { path: 'services/subscription-service/queue/$key/filters', service: 'subscription-service', expected: 'validate(false)' },
      }],
    },
    {
      name: 'filters with only wildcards inside, opened to the service',
      code: `${helpers}
module.exports = () => ({ rules: { services: { 'subscription-service': { queue: { $key: {
  '.write': 'auth != null && newData.exists() && !data.exists()',
  email: isString(),
  filters: { jobFamily: { '$index': isString() }, '$other': validate(isSubscriptionService) },
  '$other': validate(isSubscriptionService),
} } } } } })`,
      output: `${helpers}
module.exports = () => ({ rules: { services: { 'subscription-service': { queue: { $key: {
  '.write': 'auth != null && newData.exists() && !data.exists()',
  email: isString(),
  filters: { jobFamily: { '$index': isString() }, '$other': validate(false) },
  '$other': validate(isSubscriptionService),
} } } } } })`,
      errors: [{ messageId: 'otherClosed' }],
    },
    {
      name: 'a queue record closed to everyone, its own worker included',
      code: `${helpers}
module.exports = () => ({ rules: { services: { 'subscription-service': { queue: { $key: {
  '.write': 'auth != null && newData.exists() && !data.exists()',
  email: isString(),
  '$other': validate(false),
} } } } } })`,
      output: `${helpers}
module.exports = () => ({ rules: { services: { 'subscription-service': { queue: { $key: {
  '.write': 'auth != null && newData.exists() && !data.exists()',
  email: isString(),
  '$other': validate(isSubscriptionService),
} } } } } })`,
      errors: [{
        messageId: 'otherService',
        data: { path: 'services/subscription-service/queue/$key', service: 'subscription-service', expected: 'validate(isSubscriptionService)' },
      }],
    },
  ],
})
