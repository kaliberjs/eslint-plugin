const docsUrl = require('../../machinery/docsUrl')
const { forEachAccessRule, audienceOf } = require('../../machinery/firebase-rules')

// `.read` and `.write` cascade: once an ancestor grants access, nothing below it can take that
// access away (https://firebase.google.com/docs/database/security/core-syntax). A narrower rule
// further down reads like a restriction and has no effect.

/** @type {(Access | null)[]} from narrowest to widest */
const reaches = [null, 'signed-in', 'anyone']

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
      shadowed: '`{{path}}`: this `{{key}}` does nothing, `{{ancestor}}` already lets {{who}} ' +
        '{{verb}} everything below it. Restrict the parent or remove this rule.',
      revokesNothing: '`{{path}}`: `false` blocks nothing here, `{{ancestor}}` grants {{verb}} ' +
        'access below it whenever `{{condition}}`. Restrict the parent instead.',
    },
    schema: [],
  },

  create(context) {
    return forEachAccessRule(context, rule => {
      const { node, key, value, unresolved, location } = rule

      if (unresolved) return

      const ancestors = rule.above().filter(ancestor => !ancestor.unresolved)
      const [widest] = ancestors.toSorted((a, b) => reachOf(b) - reachOf(a))

      if (widest && reachOf(rule) < reachOf(widest)) {
        const who = audienceOf(widest.unconditionalAccess)

        context.report({
          node,
          messageId: 'shadowed',
          data: { key, verb: verbOf(key), path: location, ancestor: widest.location, who },
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
          verb: verbOf(key),
          path: location,
          ancestor: conditionalGrant.location,
          condition: String(conditionalGrant.value),
        },
      })
    })
  },
}

/**
 * How far the rule reaches unconditionally: 2 for anyone, 1 for any signed-in client, 0 for less.
 *
 * @param {AccessRule} rule
 */
function reachOf(rule) {
  return reaches.indexOf(rule.unconditionalAccess)
}

/** @param {'.read' | '.write'} key */
function verbOf(key) {
  return key === '.read' ? 'read' : 'write'
}

/**
 * Whether the rule is `false`, granting nothing.
 *
 * @param {unknown} value - a folded rule value
 */
function isClosed(value) {
  return value === false || value === 'false'
}

/** @typedef {import('../../machinery/firebase-rules').Access} Access */
/** @typedef {import('../../machinery/firebase-rules').AccessRule} AccessRule */
