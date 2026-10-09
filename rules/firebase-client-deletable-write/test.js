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
      name: 'a let binding is not folded: it may be reassigned',
      code: `let rule = 'auth != null'
rule = false
module.exports = () => ({ rules: { queue: { '.write': rule } } })`,
    },
    {
      name: 'a rule that does not parse is skipped',
      code: `module.exports = () => ({ rules: { queue: { '.write': 'auth != null &&' } } })`,
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
      errors: [{
        messageId: 'deletable',
        data: { path: 'poll-processing', who: 'any signed-in user', value: 'auth != null' },
        suggestions: [{ messageId: 'createOnly', output: `${helpers}
module.exports = () => ({ rules: { 'poll-processing': {
  '.write': \`(\${hasAuth()}) && !data.exists()\`,
  entries: { '.write': \`(\${hasAuth()} && \${isCreate()})\` },
} } })` }],
      }],
    },
    {
      name: 'a service or any signed-in client',
      code: `${helpers}
const isNotificationService = "(auth.uid === 'job-alert-notification-service')"
module.exports = () => ({ rules: { services: { 'job-alert-notification-service': { processedJobIds: {
  '.write': \`\${isNotificationService} || \${hasAuth()}\`,
} } } } })`,
      errors: [{
        messageId: 'deletable',
        data: {
          path: 'services/job-alert-notification-service/processedJobIds', who: 'any signed-in user',
          value: "(auth.uid === 'job-alert-notification-service') || auth != null",
        },
        suggestions: [{ messageId: 'createOnly', output: `${helpers}
const isNotificationService = "(auth.uid === 'job-alert-notification-service')"
module.exports = () => ({ rules: { services: { 'job-alert-notification-service': { processedJobIds: {
  '.write': \`(\${isNotificationService} || \${hasAuth()}) && !data.exists()\`,
} } } } })` }],
      }],
    },
    {
      name: 'a public write under a key that does not resolve',
      code: `module.exports = ({ externalId }) => ({ rules: { external: { [externalId]: { '.write': true } } } })`,
      errors: [{
        messageId: 'deletable',
        data: { path: 'external/?', who: 'anyone', value: 'true' },
        suggestions: [{ messageId: 'createOnly', output: `module.exports = ({ externalId }) => ({ rules: { external: { [externalId]: { '.write': '!data.exists()' } } } })` }],
      }],
    },
    {
      name: 'a signed-in check written as auth.uid !== null',
      code: `module.exports = () => ({ rules: { queue: { '.write': 'auth.uid !== null' } } })`,
      errors: [{
        messageId: 'deletable',
        data: { path: 'queue', who: 'any signed-in user', value: 'auth.uid !== null' },
        suggestions: [{ messageId: 'createOnly', output: `module.exports = () => ({ rules: { queue: { '.write': '(auth.uid !== null) && !data.exists()' } } })` }],
      }],
    },
    {
      name: 'a signed-in write that overwrites what exists',
      code: `module.exports = () => ({ rules: { queue: { $key: { '.write': 'auth != null && newData.exists()' } } } })`,
      errors: [{
        messageId: 'deletable',
        data: { path: 'queue/$key', who: 'any signed-in user', value: 'auth != null && newData.exists()' },
        suggestions: [{ messageId: 'createOnly', output: `module.exports = () => ({ rules: { queue: { $key: { '.write': '(auth != null && newData.exists()) && !data.exists()' } } } })` }],
      }],
    },
    {
      name: 'a signed-in write that only allows deletes',
      code: `module.exports = () => ({ rules: { queue: { $key: { '.write': 'auth != null && !newData.exists()' } } } })`,
      errors: [{
        messageId: 'deletable',
        suggestions: [{ messageId: 'createOnly', output: `module.exports = () => ({ rules: { queue: { $key: { '.write': '(auth != null && !newData.exists()) && !data.exists()' } } } })` }],
      }],
    },
    {
      name: 'the production branch of an environment check',
      code: `module.exports = () => ({ rules: { queue: {
  '.write': process.env.CONFIG_ENV === 'dev' ? false : 'auth != null',
} } })`,
      errors: [{
        messageId: 'deletable',
        suggestions: [{ messageId: 'createOnly', output: `module.exports = () => ({ rules: { queue: {
  '.write': \`(\${process.env.CONFIG_ENV === 'dev' ? false : 'auth != null'}) && !data.exists()\`,
} } })` }],
      }],
    },
  ],
})
