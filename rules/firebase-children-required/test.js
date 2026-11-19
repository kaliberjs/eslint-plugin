const { test } = require('../../machinery/test')

// Written reductions of the rules-file shapes; no client code.
const helpers = `
function validate(x) { return { '.validate': x } }
function isString() { return validate('newData.isString()') }
`

test('firebase-children-required', {
  valid: [
    {
      name: 'a client-writable record that requires its fields',
      code: `${helpers}
module.exports = () => ({ rules: { queue: { $key: {
  '.write': 'auth != null && newData.exists() && !data.exists()',
  '.validate': "newData.hasChildren(['email'])",
  email: isString(),
} } } })`,
    },
    {
      name: 'hasChildren without fields only requires an object',
      code: `${helpers}
module.exports = () => ({ rules: { queue: { $key: {
  '.write': 'auth != null', '.validate': 'newData.hasChildren()', email: isString(),
} } } })`,
    },
    {
      name: 'hasChildren beside a service disjunct',
      code: `${helpers}
const isService = "auth.uid === 'service'"
module.exports = () => ({ rules: { queue: { $key: {
  '.write': 'auth != null',
  '.validate': \`\${isService} || newData.hasChildren(['email'])\`,
  email: isString(),
} } } })`,
    },
    {
      name: 'hasChildren spread in from a helper',
      code: `${helpers}
function hasChildren(names) { return validate(\`newData.hasChildren(\${names})\`) }
module.exports = () => ({ rules: { queue: { $key: {
  '.write': 'auth != null', ...hasChildren("['email']"), email: isString(),
} } } })`,
    },
    {
      name: 'a .validate that does not fold gets the benefit of the doubt',
      code: `${helpers}
const { requireFields } = require('shared')
module.exports = () => ({ rules: { queue: { $key: {
  '.write': 'auth != null', '.validate': requireFields, email: isString(),
} } } })`,
    },
    {
      name: 'a shape only a service writes',
      code: `${helpers}
module.exports = () => ({ rules: { statusInfo: {
  '.write': "auth.uid === 'polling-service'", lastRun: isString(),
} } })`,
    },
    {
      name: 'a path tree, not a shape',
      code: `module.exports = () => ({ rules: { static: { skills: { '.read': true } } } })`,
    },
  ],
  invalid: [
    {
      name: 'a client-writable record without hasChildren',
      code: `${helpers}
module.exports = () => ({ rules: { services: { mail: { queue: { $key: {
  '.write': 'auth != null && newData.exists() && !data.exists()', email: isString(),
} } } } } })`,
      output: `${helpers}
module.exports = () => ({ rules: { services: { mail: { queue: { $key: {
  '.write': 'auth != null && newData.exists() && !data.exists()', email: isString(),
  '.validate': 'newData.hasChildren()',
} } } } } })`,
      errors: [{ messageId: 'childrenRequired', data: { path: 'services/mail/queue/$key' } }],
    },
    {
      name: 'a .validate that allows a primitive',
      code: `${helpers}
module.exports = () => ({ rules: { queue: { $key: {
  '.write': 'auth != null', '.validate': 'newData.exists()', email: isString(),
} } } })`,
      output: null,
      errors: [{ messageId: 'childrenRequired', data: { path: 'queue/$key' } }],
    },
    {
      name: 'a spread without .validate',
      code: `${helpers}
const shared = { '.indexOn': 'email' }
module.exports = () => ({ rules: { queue: { $key: {
  '.write': 'auth != null', ...shared, email: isString(),
} } } })`,
      output: `${helpers}
const shared = { '.indexOn': 'email' }
module.exports = () => ({ rules: { queue: { $key: {
  '.write': 'auth != null', ...shared, email: isString(),
  '.validate': 'newData.hasChildren()',
} } } })`,
      errors: [{ messageId: 'childrenRequired', data: { path: 'queue/$key' } }],
    },
    {
      name: 'a nested shape below a record that requires children',
      code: `${helpers}
module.exports = () => ({ rules: { queue: { '.write': 'auth != null', $key: {
  '.validate': "newData.hasChildren(['formValues'])",
  formValues: { email: isString() },
} } } })`,
      output: `${helpers}
module.exports = () => ({ rules: { queue: { '.write': 'auth != null', $key: {
  '.validate': "newData.hasChildren(['formValues'])",
  formValues: { email: isString(), '.validate': 'newData.hasChildren()' },
} } } })`,
      errors: [{ messageId: 'childrenRequired', data: { path: 'queue/$key/formValues' } }],
    },
  ],
})
