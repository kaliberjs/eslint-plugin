const { test } = require('../../machinery/test')

// Written reductions of the rules-file shapes; no client code.
const helpers = `
function hasAuth() { return \`auth != null\` }
function isCreate() { return \`newData.exists() && !data.exists()\` }
`

test('firebase-client-deletable-write', {
  valid: [
    {
      name: 'a signed-in create into an empty node',
      code: `${helpers}
module.exports = () => ({ rules: { queue: { $key: { '.write': \`\${hasAuth()} && \${isCreate()}\` } } } })`,
    },
    {
      name: 'a signed-in write that cannot replace what exists',
      code: `module.exports = () => ({ rules: { events: { $key: { '.write': "(auth.uid === 'eventService') || (!data.exists() && auth != null)" } } } })`,
    },
    {
      name: 'a write only the owner passes',
      code: `module.exports = () => ({ rules: { users: { $uid: { '.write': 'auth.uid === $uid' } } } })`,
    },
    {
      name: 'a write that needs a token claim',
      code: `module.exports = () => ({ rules: { admin: { '.write': 'auth != null && auth.token.admin === true' } } })`,
    },
    {
      name: 'a closed write',
      code: `module.exports = () => ({ rules: { '.write': false } })`,
    },
    {
      name: 'a value from an option is skipped',
      code: `module.exports = ({ isService }) => ({ rules: { queue: { '.write': isService } } })`,
    },
  ],
  invalid: [
    {
      name: 'a signed-in write on a parent of a create-only queue',
      code: `${helpers}
module.exports = () => ({ rules: { 'poll-processing': {
  '.write': hasAuth(),
  entries: { '.write': \`(\${hasAuth()} && \${isCreate()})\` },
} } })`,
      errors: [{ messageId: 'deletable', data: { path: 'poll-processing', who: 'any signed-in client', value: 'auth != null' } }],
    },
    {
      name: 'a service or any signed-in client',
      code: `${helpers}
const isNotificationService = "(auth.uid === 'job-alert-notification-service')"
module.exports = () => ({ rules: { services: { 'job-alert-notification-service': { processedJobIds: {
  '.write': \`\${isNotificationService} || \${hasAuth()}\`,
} } } } })`,
      errors: [{ messageId: 'deletable', data: {
        path: 'services/job-alert-notification-service/processedJobIds', who: 'any signed-in client',
        value: "(auth.uid === 'job-alert-notification-service') || auth != null",
      } }],
    },
    {
      name: 'a public write under a key that does not resolve',
      code: `module.exports = ({ externalId }) => ({ rules: { external: { [externalId]: { '.write': true } } } })`,
      errors: [{ messageId: 'deletable', data: { path: 'external/?', who: 'anyone', value: 'true' } }],
    },
    {
      name: 'a signed-in write that only allows deletes',
      code: `module.exports = () => ({ rules: { queue: { $key: { '.write': 'auth != null && !newData.exists()' } } } })`,
      errors: [{ messageId: 'deletable' }],
    },
    {
      name: 'a dev-only branch, linted for dev',
      code: `module.exports = () => ({ rules: { queue: {
  '.write': process.env.CONFIG_ENV === 'dev' ? 'auth != null' : false,
} } })`,
      options: [{ env: { CONFIG_ENV: 'dev' } }],
      errors: [{ messageId: 'deletable' }],
    },
  ],
})
