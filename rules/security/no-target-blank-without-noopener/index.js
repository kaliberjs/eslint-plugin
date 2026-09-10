const { getStaticValue } = require('@eslint-community/eslint-utils')
const docsUrl = require('../../../machinery/docsUrl')
const { report } = require('../../../machinery/security/finding')
const { isGlobalNamed } = require('../../../machinery/security/expression')

// Reverse tabnabbing: a page opened with a `window.opener` handle can navigate
// or script the page that opened it.
//
// For anchors this is over. HTML now defines `target="_blank"` on an `a`,
// `area` or `form` as implying `noopener` unless `rel` explicitly opts back in
// with `opener` — the "navigable target names" section of the HTML Standard,
// via `noopener` in the tokenised rel list. Every engine ships it. Reporting
// `<a target="_blank">` today is a lint rule policing a browser default, and
// the anchors it fires on are overwhelmingly fine; that visitor is gone.
//
// `window.open()` is a different call. It takes its opener behaviour from the
// features string alone, and omitting `noopener` there still hands over the
// handle.
const OPEN = 'open'

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Do not open windows with window.open() without severing the opener relationship (CWE-1022)',
      url: docsUrl(__dirname),
    },
    messages: {
      windowOpenNoopener: [
        'window.open() without noopener in its features gives the opened page a window.opener handle.',
        'The opened page can then navigate or script this application.',
        "Pass 'noopener' in the features argument (third argument).",
      ].join(' '),
      windowOpenUnknownFeatures: [
        'window.open() is called with a features argument this rule cannot read.',
        'Audit it: if the string omits noopener, the opened page gets a window.opener handle and can navigate or script this application.',
        "Pass a literal containing 'noopener', or open with `{ ...features }` assembled where it can be read.",
      ].join(' '),
    },
    // No fix: appending to a features string the rule could not read is how a
    // fix breaks a popup's dimensions.
    schema: [],
  },

  create(context) {
    return {
      CallExpression(node) {
        const callee = node.callee
        if (callee.type !== 'MemberExpression' || callee.computed) return
        if (callee.property?.name !== OPEN) return

        // The real `window`, not a local of that name — `.open()` also belongs
        // to files, databases, sockets and every test double of those.
        if (!isGlobalNamed(context.sourceCode, callee.object, 'window')) return

        const features = node.arguments[2]

        // No features argument at all is the default-opener case.
        if (!features) {
          return report(context, { node, messageId: 'windowOpenNoopener', severity: 'medium', confidence: 0.9 })
        }

        // Folded through getStaticValue rather than requiring an inline
        // Literal, so a const alias for the features string is not a wall.
        const value = getStaticValue(features, context.sourceCode.getScope(features))

        if (typeof value?.value !== 'string') {
          // Unread is not the same as safe. Reported as the open question it
          // is, at a confidence that says so, in the audit preset only.
          return report(context, { node, messageId: 'windowOpenUnknownFeatures', severity: 'medium', confidence: 0.6 })
        }

        if (!/noopener/i.test(value.value)) {
          return report(context, { node, messageId: 'windowOpenNoopener', severity: 'medium', confidence: 1 })
        }
      },
    }
  },
}
