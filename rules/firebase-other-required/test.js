const { test } = require('../../machinery/test')

// Written reductions of the rules-file shapes; no client code.
const helpers = `
function validate(x) { return { '.validate': x } }
function isString() { return validate('newData.isString()') }
`

test('firebase-other-required', {
  valid: [
    {
      name: 'validated fields closed by $other',
      code: `${helpers}
module.exports = () => ({ rules: { queue: { $key: {
  '.write': 'auth != null', email: isString(), '$other': validate(false),
} } } })`,
    },
    {
      name: '$other that only a service may write',
      code: `${helpers}
const isService = "auth.uid === 'service'"
module.exports = () => ({ rules: { subscribed: { $id: {
  language: isString(), '$other': validate(isService),
} } } })`,
    },
    {
      name: 'a nested shape closed at both levels',
      code: `${helpers}
module.exports = () => ({ rules: { entries: { $key: {
  formValues: { email: isString(), '$other': validate(false) },
  '$other': validate(false),
} } } })`,
    },
    {
      name: 'a path tree, not a shape: children carry .read and .write',
      code: `module.exports = () => ({ rules: { static: { skills: { '.read': true } } } })`,
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
      name: 'validated fields with nothing for other keys',
      code: `${helpers}
module.exports = () => ({ rules: { services: { mail: { queue: { $key: {
  '.write': 'auth != null', email: isString(),
} } } } } })`,
      errors: [{ messageId: 'otherRequired', data: { path: 'services/mail/queue/$key' } }],
    },
    {
      name: 'a nested shape left open',
      code: `${helpers}
module.exports = () => ({ rules: { entries: { $key: {
  '.write': 'auth != null && newData.exists()',
  formValues: { email: isString() },
  '$other': validate(false),
} } } })`,
      errors: [{ messageId: 'otherRequired', data: { path: 'entries/$key/formValues' } }],
    },
    {
      name: 'a $other without .validate limits nothing',
      code: `${helpers}
module.exports = () => ({ rules: { queue: { '.write': 'auth != null', $key: {
  email: isString(), '$other': { '.read': true },
} } } })`,
      errors: [{ messageId: 'otherRequired', data: { path: 'queue/$key' } }],
    },
  ],
})
