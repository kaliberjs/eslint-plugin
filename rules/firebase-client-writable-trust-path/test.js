const { test } = require('../../machinery/test')

// Written reductions of the rules-file shapes; no client code.
const helpers = `
function hasAuth() { return \`auth != null\` }
function isCreate() { return \`newData.exists() && !data.exists()\` }
function validate(x) { return { '.validate': x } }
`

const words = ['verified', 'approved', 'confirmed', 'admin', 'employee']

test('firebase-client-writable-trust-path', configured({
  valid: [
    {
      name: 'a signed-in create under a plain queue with plain fields',
      code: `${helpers}
module.exports = () => ({ rules: { services: { mail: { queue: { $key: {
  '.write': \`(\${hasAuth()} && \${isCreate()})\`, email: validate('newData.isString()'),
} } } } } })`,
    },
    {
      name: 'a trust path written only by its owner',
      code: `module.exports = () => ({ rules: { verified: { $uid: { '.write': 'auth.uid === $uid' } } } })`,
    },
    {
      name: 'a trust path that needs a token claim',
      code: `module.exports = () => ({ rules: { admin: { '.write': 'auth != null && auth.token.admin === true' } } })`,
    },
    {
      name: 'a value from an option is skipped silently',
      code: `module.exports = ({ isService }) => ({ rules: { verified: { '.write': isService } } })`,
    },
    {
      name: 'a dev-only branch folds to production',
      code: `module.exports = () => ({ rules: { verified: {
  '.write': process.env.CONFIG_ENV === 'dev' ? 'auth != null' : false,
} } })`,
    },
    {
      name: 'an employee field beside a write that needs an employee claim',
      code: `${helpers}
module.exports = () => ({ rules: { queue: { $key: {
  '.write': 'auth != null && auth.token.employee === true', isEmployee: validate('newData.isBoolean()'),
} } } })`,
    },
    {
      name: 'a trust name the project did not configure',
      code: `module.exports = () => ({ rules: { approved: { '.write': true } } })`,
      options: [{ words: ['employee'] }],
    },
  ],
  invalid: [
    {
      name: 'a signed-in create under a queue whose name claims verification',
      code: `${helpers}
const service = 'subscription-service'
module.exports = () => ({ rules: { services: { [service]: { 'verified-queue': { $key: {
  '.write': \`(\${hasAuth()} && \${isCreate()})\`, subscriptionId: validate('newData.isString()'),
} } } } } })`,
      errors: [{ messageId: 'trustPath', data: {
        path: 'services/subscription-service/verified-queue/$key', names: 'verified-queue',
        value: '(auth != null && newData.exists() && !data.exists())',
      } }],
    },
    {
      name: 'a signed-in create beside a field that claims trust',
      code: `${helpers}
module.exports = () => ({ rules: { queue: { $key: {
  '.write': hasAuth(), isAdmin: validate('newData.isBoolean()'),
} } } })`,
      errors: [{ messageId: 'trustPath', data: { path: 'queue/$key', names: 'isAdmin', value: 'auth != null' } }],
    },
    {
      name: 'a service or any signed-in client, under a trust name',
      code: `const isWorker = "(auth.uid === 'worker')"
module.exports = () => ({ rules: { confirmedIds: { '.write': \`\${isWorker} || auth != null\` } } })`,
      errors: [{ messageId: 'trustPath' }],
    },
    {
      name: 'a public write under a trust name',
      code: `module.exports = () => ({ rules: { approved: { '.write': true } } })`,
      errors: [{ messageId: 'trustPath' }],
    },
    {
      name: 'the production branch of an environment check',
      code: `module.exports = () => ({ rules: { verified: {
  '.write': process.env.CONFIG_ENV === 'dev' ? false : 'auth != null',
} } })`,
      errors: [{ messageId: 'trustPath' }],
    },
    {
      name: 'a signed-in create beside a field that claims employment',
      code: `${helpers}
module.exports = () => ({ rules: { applications: { $key: {
  '.write': \`(\${hasAuth()} && \${isCreate()})\`, isEmployee: validate('newData.isBoolean()'),
} } } })`,
      errors: [{ messageId: 'trustPath', data: {
        path: 'applications/$key', names: 'isEmployee',
        value: '(auth != null && newData.exists() && !data.exists())',
      } }],
    },
  ],
}))

/**
 * Adds the trust words to every case, beside any options the case has.
 *
 * @param {{ valid: any[], invalid: any[] }} tests
 */
function configured({ valid, invalid }) {
  return { valid: valid.map(withWords), invalid: invalid.map(withWords) }

  /** @param {any} testCase */
  function withWords(testCase) {
    return { ...testCase, options: [{ words, ...testCase.options?.[0] }] }
  }
}
