const { test } = require('../../machinery/test')

// Written reductions of the rules-file shapes; no client code.
const helpers = `
function hasAuth() { return \`auth != null\` }
function isCreate() { return \`newData.exists() && !data.exists()\` }
function isUpdate() { return \`newData.exists() && data.exists() && data.child('uid').val() === auth.uid\` }
function validate(x) { return { '.validate': x } }
function isString() { return validate('newData.isString()') }
`

test('firebase-unbound-uid', {
  valid: [
    {
      name: 'a uid validated against auth.uid',
      code: `${helpers}
module.exports = () => ({ rules: { queue: { $key: {
  '.write': \`\${hasAuth()} && \${isCreate()}\`, uid: validate('newData.val() === auth.uid'),
} } } })`,
    },
    {
      name: 'a write that names auth.uid is not open to any client',
      code: `${helpers}
module.exports = () => ({ rules: { queue: { $key: {
  '.write': \`\${hasAuth()} && \${isCreate()} && newData.child('uid').val() === auth.uid\`, uid: isString(),
} } } })`,
    },
    {
      name: 'a record only its owner writes',
      code: `${helpers}
module.exports = () => ({ rules: { users: { $uid: { '.write': 'auth.uid === $uid', uid: isString() } } } })`,
    },
    {
      name: 'a uuid is not an owner field',
      code: `${helpers}
module.exports = () => ({ rules: { queue: { $key: { '.write': \`\${hasAuth()} && \${isCreate()}\`, uuid: isString() } } } })`,
    },
    {
      name: 'an id that does not name a user',
      code: `${helpers}
module.exports = () => ({ rules: { queue: { $key: { '.write': \`\${hasAuth()} && \${isCreate()}\`, jobId: isString() } } } })`,
    },
    {
      name: 'a validation that does not resolve is skipped',
      code: `${helpers}
const { isUid } = require('shared')
module.exports = () => ({ rules: { queue: { $key: { '.write': \`\${hasAuth()} && \${isCreate()}\`, uid: isUid() } } } })`,
    },
  ],
  invalid: [
    {
      name: 'an application task with a uid any client sets',
      code: `${helpers}
module.exports = () => ({ rules: { services: { 'application-processing-service': { queue: { $key: {
  '.write': \`(\${hasAuth()} && \${isCreate()})\`, jobId: isString(), uid: isString(),
} } } } } })`,
      errors: [{ messageId: 'unboundUid', data: { field: 'uid', path: 'services/application-processing-service/queue/$key' } }],
    },
    {
      name: 'a userUid any client sets',
      code: `${helpers}
module.exports = () => ({ rules: { queue: { $key: { '.write': \`\${hasAuth()} && \${isCreate()}\`, userUid: isString() } } } })`,
      errors: [{ messageId: 'unboundUid', data: { field: 'userUid', path: 'queue/$key' } }],
    },
    {
      name: 'an update that checks the old uid, not the new one',
      code: `${helpers}
module.exports = () => ({ rules: { feedback: { entries: { $key: {
  '.write': \`(\${hasAuth()} && (\${isCreate()}) || (\${isUpdate()}))\`, uid: isString(),
} } } } })`,
      errors: [{ messageId: 'unboundUid', data: { field: 'uid', path: 'feedback/entries/$key' } }],
    },
  ],
})
