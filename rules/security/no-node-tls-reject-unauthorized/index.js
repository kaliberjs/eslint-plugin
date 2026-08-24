const docsUrl = require('../../../machinery/docsUrl')
const { report } = require('../../../machinery/security/finding')

// The variable is a single, exact assignment: `NODE_TLS_REJECT_UNAUTHORIZED`
// set to a falsy value disables certificate verification process-wide,
// including for connections made by dependencies. Node itself emits a warning
// when this happens. There is no legitimate production use — the correct fix
// is to supply the right CA bundle (`ca:` or NODE_EXTRA_CA_CERTS), which is a
// human decision, so there is no autofix.
const VARIABLE = 'NODE_TLS_REJECT_UNAUTHORIZED'

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Never set NODE_TLS_REJECT_UNAUTHORIZED to 0 (CWE-295, OWASP A02:2021-Cryptographic Failures)',
      url: docsUrl(__dirname),
    },
    messages: {
      tlsRejectUnauthorized: [
        'Setting NODE_TLS_REJECT_UNAUTHORIZED to {{ value }} disables certificate verification for every TLS connection this process makes, including connections made by dependencies.',
        'Any network-position attacker can intercept these connections.',
        'Supply the correct CA instead (`ca:` option or the NODE_EXTRA_CA_CERTS environment variable).',
      ].join(' '),
    },
    // No fix and no suggestion. Deleting the line may break the workflow that
    // motivated it, and the real fix — obtaining and supplying the CA — cannot
    // be generated. See AGENTS.md on autofixing security-sensitive code.
    schema: [],
  },

  create(context) {
    return {
      AssignmentExpression(node) {
        if (!isEnvVariable(node.left)) return
        if (!isDisablingValue(node.right)) return

        report(context, {
          node,
          messageId: 'tlsRejectUnauthorized',
          data: { value: context.sourceCode.getText(node.right) },
          severity: 'high',
          confidence: 1,
        })
      },

      // Object.assign(process.env, { NODE_TLS_REJECT_UNAUTHORIZED: '0' })
      CallExpression(node) {
        if (!isObjectAssignOntoProcessEnv(node)) return
        const properties = node.arguments[1]?.properties || []
        for (const property of properties) {
          if (property.type !== 'Property') continue
          if (propertyName(property) !== VARIABLE) continue
          if (!isDisablingValue(property.value)) continue

          report(context, {
            node: property,
            messageId: 'tlsRejectUnauthorized',
            data: { value: context.sourceCode.getText(property.value) },
            severity: 'high',
            confidence: 1,
          })
        }
      },
    }
  },
}

function isDisablingValue(node) {
  if (node?.type !== 'Literal') return false
  const value = node.value
  return value === 0 || value === '0'
}

function isEnvVariable(node) {
  if (node.type !== 'MemberExpression') return false
  return node.object.type === 'MemberExpression'
    && node.object.object.type === 'Identifier'
    && node.object.object.name === 'process'
    && node.object.property.type === 'Identifier'
    && node.object.property.name === 'env'
    && propertyNameFromMember(node) === VARIABLE
}

function propertyNameFromMember(node) {
  if (!node.computed) return node.property?.name
  return node.property?.type === 'Literal' ? node.property.value : undefined
}

function isObjectAssignOntoProcessEnv(node) {
  if (node.callee.type !== 'MemberExpression') return false
  if (node.callee.object.type !== 'Identifier' || node.callee.object.name !== 'Object') return false
  if (node.callee.property.type !== 'Identifier' || node.callee.property.name !== 'assign') return false

  const target = node.arguments[0]
  return target?.type === 'MemberExpression'
    && target.object.type === 'Identifier'
    && target.object.name === 'process'
    && target.property.type === 'Identifier'
    && target.property.name === 'env'
}

function propertyName(property) {
  if (property.computed) return property.key?.type === 'Literal' ? property.key.value : undefined
  return property.key?.name ?? property.key?.value
}
