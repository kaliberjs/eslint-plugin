const { findVariable } = require('@eslint-community/eslint-utils')
const { getStaticPropertyName } = require('../../../machinery/ast')
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
        if (!isEnvVariable(node.left, context)) return
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
        if (!isObjectAssignOntoProcessEnv(node, context)) return
        const properties = node.arguments[1]?.properties || []
        for (const property of properties) {
          if (property.type !== 'Property') continue
          if (getStaticPropertyName(property) !== VARIABLE) continue
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

function isEnvVariable(node, context) {
  if (node.type !== 'MemberExpression') return false
  return isProcessEnvExpression(node.object, context) && propertyNameFromMember(node) === VARIABLE
}

function propertyNameFromMember(node) {
  if (!node.computed) return node.property?.name
  return node.property?.type === 'Literal' ? node.property.value : undefined
}

/**
 * `process.env` directly, or one level of local indirection: `const { env }
 * = process` or `const env = process.env`. Destructuring process before
 * reading a specific variable off it is ordinary code, not an evasion.
 */
function isProcessEnvExpression(node, context) {
  if (isProcessDotEnv(node)) return true
  if (node.type !== 'Identifier') return false

  const variable = findVariable(context.sourceCode.getScope(node), node)
  const definition = variable?.defs[0]
  if (definition?.type !== 'Variable') return false

  if (isProcessDotEnv(definition.node.init)) return true

  const property = definition.name.parent
  return property?.type === 'Property'
    && property.key?.type === 'Identifier' && property.key.name === 'env'
    && definition.node.init?.type === 'Identifier' && definition.node.init.name === 'process'
}

function isProcessDotEnv(node) {
  return node?.type === 'MemberExpression'
    && node.object.type === 'Identifier' && node.object.name === 'process'
    && node.property.type === 'Identifier' && node.property.name === 'env'
}

function isObjectAssignOntoProcessEnv(node, context) {
  if (node.callee.type !== 'MemberExpression') return false
  if (node.callee.object.type !== 'Identifier' || node.callee.object.name !== 'Object') return false
  if (node.callee.property.type !== 'Identifier' || node.callee.property.name !== 'assign') return false

  return Boolean(node.arguments[0]) && isProcessEnvExpression(node.arguments[0], context)
}
