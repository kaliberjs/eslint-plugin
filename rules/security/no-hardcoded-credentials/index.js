const { getStaticPropertyName } = require('../../../machinery/ast')
const docsUrl = require('../../../machinery/docsUrl')
const { report } = require('../../../machinery/security/finding')
const { isNonTrivialStringLiteral } = require('../../../machinery/security/expression')

// The precise half of the credentials family: credential-named options and
// connection properties carrying string literals. No entropy scanning —
// that half of the family is a documented noise generator. Values from
// process.env or a secrets manager are the remediation and never match.

const CREDENTIAL_KEYS = new Set([
  'password', 'passwd', 'pwd', 'pass', 'secret', 'apiSecret', 'clientSecret',
  'privateKey', 'passphrase',
])

// Connection strings embed credentials inline; a literal one is a finding
// even though its key name is generic.
const CONNECTION_STRING = /^\s*(postgres(ql)?|mysql|mongodb(\+srv)?|redis|amqp):\/\/[^\s]*:[^\s@]*@/i

// express-basic-auth's users map is a credential shape CREDENTIAL_KEYS can
// never see: the password sits under an arbitrary *username* key
// (`{ users: { admin: 'supersecret' } }`), not a fixed name. Gated on the
// call rather than matching any object with a `users` property, because a
// bare shape match would fire on a username-to-role map (`{ alice: 'editor' }`)
// just as readily as a real password map — both are string-valued objects
// keyed by arbitrary names. Both real call-site spellings observed across
// the surveyed projects; no shared wrapper hides this one, so the call
// itself is always visible at the point it matters.
const BASIC_AUTH_CALLEE = /^(basicAuth|expressBasicAuth)$/

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Do not hardcode credentials in source (CWE-798)',
      url: docsUrl(__dirname),
    },
    messages: {
      hardcodedCredential: [
        "The '{{ key }}' option is set to a string literal.",
        'A credential in source reaches everyone who can read the repository, including build logs and git history.',
        'Load it from configuration outside the source (process.env or a secrets manager).',
      ].join(' '),
      connectionString: [
        'This connection string embeds credentials in source.',
        'Connection strings in code leak through repositories, bundles and logs.',
        'Build it from environment configuration instead.',
      ].join(' '),
      hardcodedBasicAuthPassword: [
        "The basic-auth user '{{ user }}' has a string literal password.",
        'A credential in source reaches everyone who can read the repository, including build logs and git history.',
        'Load it from configuration outside the source (process.env or a secrets manager).',
      ].join(' '),
    },
    schema: [],
  },

  create(context) {
    return {
      Property(node) {
        const key = String(getStaticPropertyName(node) ?? '')
        if (!CREDENTIAL_KEYS.has(key)) return
        if (!isNonTrivialStringLiteral(node.value)) return

        report(context, {
          node,
          messageId: 'hardcodedCredential',
          data: { key },
          severity: 'medium',
          confidence: 1,
        })
      },

      CallExpression(node) {
        if (node.callee.type !== 'Identifier' || !BASIC_AUTH_CALLEE.test(node.callee.name)) return

        const options = node.arguments[0]
        if (options?.type !== 'ObjectExpression') return

        const usersProperty = options.properties.find(property =>
          property.type === 'Property' && getStaticPropertyName(property) === 'users'
        )
        if (usersProperty?.value.type !== 'ObjectExpression') return

        for (const userProperty of usersProperty.value.properties) {
          if (userProperty.type !== 'Property') continue
          if (!isNonTrivialStringLiteral(userProperty.value)) continue

          report(context, {
            node: userProperty,
            messageId: 'hardcodedBasicAuthPassword',
            data: { user: String(getStaticPropertyName(userProperty) ?? '') },
            severity: 'medium',
            confidence: 1,
          })
        }
      },

      Literal(node) {
        const value = String(node.value ?? '')
        // A literal whose parent is not a template/call position we already
        // cover; matching any string that parses as a credentialed URL.
        if (!CONNECTION_STRING.test(value)) return

        report(context, {
          node,
          messageId: 'connectionString',
          severity: 'medium',
          confidence: 1,
        })
      },
    }
  },
}
