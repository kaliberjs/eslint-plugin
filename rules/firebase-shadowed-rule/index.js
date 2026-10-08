const docsUrl = require('../../machinery/docsUrl')
const {
  forEachAccessRule, optionsSchema, accessOf, audienceOf,
} = require('../../machinery/firebase-rules')

// `.read` and `.write` cascade: once an ancestor grants access, nothing below it can take that
// access away (https://firebase.google.com/docs/database/security/core-syntax). A narrower rule
// further down reads like a restriction and has no effect.

/** @type {Record<Access, number>} */
const reach = { anyone: 2, 'signed-in': 1 }

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow a Firebase `.read` or `.write` that narrows what an ancestor ' +
        'already grants, which has no effect (CWE-284, OWASP A01:2025)',
      url: docsUrl(__dirname),
    },
    messages: {
      shadowed: '`{{key}}` at {{path}} has no effect: `{{key}}` at {{ancestor}} already grants ' +
        '{{who}} access to everything below it.',
      revokesNothing: '`{{key}}: false` at {{path}} has no effect: whenever `{{key}}` at ' +
        '{{ancestor}} grants access, it reaches everything below it: {{condition}}',
    },
    schema: optionsSchema(),
  },

  create(context) {
    return forEachAccessRule(context, rule => {
      const { node, key, value, unresolved, location } = rule

      if (unresolved) return

      const ancestors = rule.above().filter(ancestor => !ancestor.unresolved)
      const grant = widestUnconditionalGrant(ancestors)

      if (grant && reachOf(unconditionalAccessOf(value)) < reachOf(grant.access)) {
        const { rule: ancestor, access } = grant

        context.report({
          node,
          messageId: 'shadowed',
          data: { key, path: location, ancestor: ancestor.location, who: audienceOf(access) },
        })
        return
      }

      const conditionalGrant = ancestors.find(ancestor => !isClosed(ancestor.value))

      if (!isClosed(value) || !conditionalGrant) return

      context.report({
        node,
        messageId: 'revokesNothing',
        data: {
          key,
          path: location,
          ancestor: conditionalGrant.location,
          condition: String(conditionalGrant.value),
        },
      })
    })
  },
}

/**
 * @param {AccessRule[]} rules
 * @returns {Grant | undefined} the rule that grants the widest access unconditionally
 */
function widestUnconditionalGrant(rules) {
  return rules
    .map(rule => ({ rule, access: unconditionalAccessOf(rule.value) }))
    .filter(/** @returns {grant is Grant} */ grant => grant.access !== null)
    .sort((a, b) => reachOf(b.access) - reachOf(a.access))[0]
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

/**
 * @param {unknown} value - a folded rule value
 * @returns {boolean} whether the rule is `false`, granting nothing
 */
function isClosed(value) {
  return value === false || value === 'false'
}

/** @typedef {import('../../machinery/firebase-rules').Access} Access */
/** @typedef {import('../../machinery/firebase-rules').AccessRule} AccessRule */
/** @typedef {{ rule: AccessRule, access: Access }} Grant */
