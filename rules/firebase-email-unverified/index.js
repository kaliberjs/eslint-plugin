const docsUrl = require('../../machinery/docsUrl')
const { forEachAccessRule } = require('../../machinery/firebase-rules')

// `auth.token.email` is the address the sign-in claims, not one that's proven. Only
// `auth.token.email_verified` says the user owns it
// (https://firebase.google.com/docs/rules/rules-and-auth). Which sign-in methods are switched on
// lives in the Firebase console, out of sight of the code, so a rule that trusts an email checks
// that it's verified itself.

const readsEmail = /auth\.token\.email(?!_)/
const requiresVerifiedEmail = /auth\.token\.email_verified\s*(===?\s*true|&&|\)|$)/

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow a Firebase `.read` or `.write` that trusts `auth.token.email` ' +
        'without requiring `auth.token.email_verified` (CWE-287, OWASP A07:2025)',
      url: docsUrl(__dirname),
    },
    messages: {
      emailUnverified: '`{{key}}` at {{path}} trusts `auth.token.email` without requiring ' +
        '`auth.token.email_verified === true`: an unverified sign-in can claim any address.',
    },
    schema: [],
  },

  create(context) {
    return forEachAccessRule(context, ({ node, key, disjuncts, location }) => {
      if (!disjuncts.some(trustsUnverifiedEmail)) return

      context.report({ node, messageId: 'emailUnverified', data: { key, path: location } })
    })
  },
}

/**
 * Whether the branch grants access on an email claim without requiring it to be verified.
 *
 * @param {string} disjunct - one `||` branch of a folded `.read` or `.write`
 */
function trustsUnverifiedEmail(disjunct) {
  return readsEmail.test(disjunct) && !requiresVerifiedEmail.test(disjunct)
}
