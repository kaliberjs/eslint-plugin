const { test } = require('../../machinery/test')

// Written reductions of the rules-file shapes; no client code.
test('firebase-email-unverified', {
  valid: [
    {
      name: 'an email claim that must be verified',
      code: `module.exports = () => ({ rules: { spots: {
  '.read': "auth != null && auth.token.email_verified === true && auth.token.email.endsWith('@example.com')",
} } })`,
    },
    {
      name: 'a verified check written without === true',
      code: `module.exports = () => ({ rules: { spots: {
  '.read': "auth.token.email_verified && auth.token.email === 'office@example.com'",
} } })`,
    },
    {
      name: 'a rule that pins a uid, not an email',
      code: `module.exports = () => ({ rules: { spots: { '.read': "auth.uid === 'spots-service'" } } })`,
    },
  ],
  invalid: [
    {
      name: 'an email domain without verification',
      code: `module.exports = () => ({ rules: { parking: { spots: {
  '.read': "(auth != null && auth.token.email.endsWith('@example.com'))",
} } } })`,
      errors: [{ messageId: 'emailUnverified', data: { key: '.read', path: 'parking/spots' } }],
    },
    {
      name: 'an exact email beside a provider check, folded from a helper',
      code: `function authHasEmail(email) {
  return \`(auth != null && auth.provider !== 'anonymous' && auth.token.email === '\${email}')\`
}
module.exports = () => ({ rules: { offers: { $key: {
  '.write': \`auth.uid === 'offer-service' || \${authHasEmail('sales@example.com')}\`,
} } } })`,
      errors: [{ messageId: 'emailUnverified', data: { key: '.write', path: 'offers/$key' } }],
    },
    {
      name: 'a verified check that is required to be false',
      code: `module.exports = () => ({ rules: { spots: {
  '.read': "auth.token.email_verified === false && auth.token.email === 'x@example.com'",
} } })`,
      errors: [{ messageId: 'emailUnverified' }],
    },
  ],
})
