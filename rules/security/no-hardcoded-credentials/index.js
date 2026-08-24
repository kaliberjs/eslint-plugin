const docsUrl = require('../../../machinery/docsUrl')
const { report } = require('../../../machinery/security/finding')

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
    },
    schema: [],
  },

  create(context) {
    return {
      Property(node) {
        if (node.computed) return
        const key = String(node.key?.name ?? '')
        if (!CREDENTIAL_KEYS.has(key)) return
        if (!isCredentialLiteral(node.value)) return

        report(context, {
          node,
          messageId: 'hardcodedCredential',
          data: { key },
          severity: 'medium',
          confidence: 1,
        })
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

function isCredentialLiteral(node) {
  return node?.type === 'Literal'
    && typeof node.value === 'string'
    && node.value.length >= 4
}
