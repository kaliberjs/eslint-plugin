const docsUrl = require('../../machinery/docsUrl')
const { isFunctionNode } = require('../../machinery/ast')
const { staticValue } = require('../../machinery/static-value')
const { keyOf, pathOf, accessOf, audienceOf } = require('../../machinery/firebase-rules')

// `.read` and `.write` cascade: once an ancestor grants access, nothing below
// it can take that access away. A narrower rule further down reads like a
// restriction and has no effect.

/** @type {Record<Access, number>} */
const reach = { anyone: 2, 'signed-in': 1 }

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow a Firebase `.read` or `.write` that narrows what an ancestor already grants, which has no effect (CWE-284, OWASP A01:2025)',
      url: docsUrl(__dirname),
    },
    messages: {
      shadowed: '`{{key}}` at {{path}} has no effect: `{{key}}` at {{ancestor}} already grants {{who}} access to everything below it.',
    },
    schema: [
      {
        type: 'object',
        properties: {
          env: { type: 'object', additionalProperties: { type: 'string' } },
        },
        additionalProperties: false,
      },
    ],
  },

  create(context) {
    const { env = {} } = context.options[0] ?? {}
    const { sourceCode } = context

    return {
      Property(node) {
        const key = keyOf(node, sourceCode)

        if (key !== '.read' && key !== '.write') return

        const rule = staticValue(node.value, sourceCode, env)

        if (rule.unresolved) return

        const grant = widestGrantAbove(node, key, sourceCode, env)

        if (!grant || !grantsLessThan(rule.value, grant.access)) return

        context.report({
          node,
          messageId: 'shadowed',
          data: {
            key,
            path: pathOf(node, sourceCode).join('/'),
            ancestor: pathOf(grant.rule, sourceCode).join('/') || 'the root',
            who: audienceOf(grant.access),
          },
        })
      },
    }
  },
}

/**
 * The rule with the same key above `node` that grants the widest access unconditionally.
 *
 * @param {import('eslint').Rule.Node} node - a `.read` or `.write` property
 * @param {'.read' | '.write'} key
 * @param {import('eslint').SourceCode} sourceCode
 * @param {Record<string, string>} env
 * @returns {Grant | null}
 */
function widestGrantAbove(node, key, sourceCode, env) {
  return rulesAbove(node, key, sourceCode)
    .map(rule => ({ rule, access: unconditionalAccessOf(staticValue(rule.value, sourceCode, env).value) }))
    .filter(isGrant)
    .sort((a, b) => reachOf(b.access) - reachOf(a.access))[0] ?? null
}

/**
 * @param {import('eslint').Rule.Node} node
 * @param {'.read' | '.write'} key
 * @param {import('eslint').SourceCode} sourceCode
 * @returns {RuleProperty[]} the rules with the same key in the objects enclosing `node`, up to the nearest function
 */
function rulesAbove(node, key, sourceCode) {
  const rules = []

  for (let ancestor = node.parent?.parent; ancestor && !isFunctionNode(ancestor); ancestor = ancestor.parent) {
    if (ancestor.type !== 'ObjectExpression') continue

    const rule = ancestor.properties.find(property => property.type === 'Property' && keyOf(property, sourceCode) === key)

    if (rule) rules.push(/** @type {RuleProperty} */ (rule))
  }

  return rules
}

/**
 * @param {{ rule: RuleProperty, access: Access | null }} candidate
 * @returns {candidate is Grant}
 */
function isGrant(candidate) {
  return candidate.access !== null
}

/**
 * @param {unknown} value - a folded rule value
 * @param {Access} access - what an ancestor grants
 * @returns {boolean}
 */
function grantsLessThan(value, access) {
  return reachOf(unconditionalAccessOf(value)) < reachOf(access)
}

/**
 * @param {unknown} value - a folded rule value
 * @returns {Access | null}
 */
function unconditionalAccessOf(value) {
  return accessOf(value, { unconditional: true })
}

/**
 * @param {Access | null} access
 * @returns {number} 2 for anyone, 1 for any signed-in client, 0 for less
 */
function reachOf(access) {
  return access ? reach[access] : 0
}

/** @typedef {import('../../machinery/firebase-rules').Access} Access */
/** @typedef {import('../../machinery/firebase-rules').RuleProperty} RuleProperty */
/** @typedef {{ rule: RuleProperty, access: Access }} Grant */
