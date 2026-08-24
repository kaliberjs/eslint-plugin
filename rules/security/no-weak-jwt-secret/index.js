const docsUrl = require('../../../machinery/docsUrl')
const { report } = require('../../../machinery/security/finding')

// The precise half of the secrets family: a *literal* passed where a secret
// belongs. No entropy scanning — that half of the family is a documented
// noise generator that fires on fixtures and base64 blobs and discredits
// the precise rules shipped alongside it.

// Option-property names that mean a JWT/HMAC secret in known middleware.
// Deliberately narrow — a generic `password:` property on any object would
// fire on seed files and form defaults, which is the noise that discredits
// the whole secrets family.
const SECRET_PARAMS = new Set(['secret', 'secretOrKey'])

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Do not sign or verify JWTs with a literal secret (CWE-321)',
      url: docsUrl(__dirname),
    },
    messages: {
      hardcodedSecret: [
        '{{ callee }} receives its secret as a string literal.',
        'Every holder of this repository can mint valid tokens; rotation requires a code change.',
        'Read the secret from configuration outside the source (process.env or a secrets manager).',
      ].join(' '),
    },
    // No autofix: wiring a secrets source is application work.
    schema: [],
  },

  create(context) {
    return {
      CallExpression(node) {
        const callee = node.callee
        if (callee.type !== 'MemberExpression' || callee.computed) return

        const method = callee.property?.name
        if (method !== 'sign' && method !== 'verify') return

        // Object root must be jwt-shaped; note 'jsonwebtoken' has no 'jwt'
        // substring. Bare-name calls are deliberately out of scope here:
        // sign/verify are hopelessly generic names.
        const root = callee.object?.type === 'Identifier' ? callee.object.name : null
        if (!root || !/^(jwt|jsonwebtoken|jws|jose)/i.test(root)) return

        // sign(payload, secret) / verify(token, secret[, options])
        const secret = node.arguments[method === 'sign' ? 1 : 1]
        if (!isStringLiteral(secret)) return

        report(context, {
          node: secret,
          messageId: 'hardcodedSecret',
          data: { callee: context.sourceCode.getText(callee) },
          severity: 'medium',
          confidence: 1,
        })
      },

      Property(node) {
        // express-jwt({ secret: 'literal' }), passport strategies,
        // session middlewares: an options property named like a secret.
        if (node.computed || !SECRET_PARAMS.has(String(node.key?.name ?? ''))) return
        if (!isStringLiteral(node.value)) return

        report(context, {
          node,
          messageId: 'hardcodedSecret',
          data: { callee: `the '${node.key.name}' option` },
          severity: 'medium',
          confidence: 1,
        })
      },
    }
  },
}

function isStringLiteral(node) {
  return node?.type === 'Literal'
    && typeof node.value === 'string'
    && node.value.length >= 4
}
