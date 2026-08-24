const { getStaticValue } = require('@eslint-community/eslint-utils')
const { getStaticPropertyName } = require('../../../machinery/ast')
const docsUrl = require('../../../machinery/docsUrl')
const { report } = require('../../../machinery/security/finding')

// Turning off a template engine's autoescaping re-opens XSS for every value
// that ever flows through it — one configuration line defeats what the
// engine does for every template. The JS-visible slice: option properties
// and the escape-hatch APIs of Handlebars, nunjucks and Angular.

// Angular's explicit trust escapes; everything else here is an engine-wide
// or per-value switch.
const TRUST_METHODS = /^bypassSecurityTrust\w+$/

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Do not disable template autoescaping (CWE-116)',
      url: docsUrl(__dirname),
    },
    messages: {
      autoescapeDisabled: [
        '{{ what }} bypasses output escaping.',
        'Every value rendered through it is trusted implicitly, so one unsanitized CMS or user field becomes stored XSS.',
        'Keep escaping on; mark individual trusted values explicitly at the call site instead.',
      ].join(' '),
    },
    schema: [],
  },

  create(context) {
    return {
      Property(node) {
        const name = getStaticPropertyName(node)
        const value = getStaticValue(node.value, context.sourceCode.getScope(node.value))

        if (name === 'autoescape' && value?.value === false) {
          emit(context, node, 'autoescape: false')
        }
        if (name === 'noEscape' && value?.value === true) {
          emit(context, node, 'noEscape: true')
        }
      },

      NewExpression(node) {
        // new Handlebars.SafeString(x) — marks x as pre-escaped.
        if (getCalleeName(node.callee) !== 'SafeString') return
        const root = String(node.callee.object?.name ?? node.callee.object?.property?.name ?? '')
        if (/handlebars/i.test(root)) emit(context, node, `${root}.SafeString()`)
      },

      CallExpression(node) {
        if (node.callee.type !== 'MemberExpression' || node.callee.computed) return
        const method = String(node.callee.property?.name ?? '')
        if (!TRUST_METHODS.test(method)) return
        const root = node.callee.object?.type === 'MemberExpression' ? node.callee.object.object?.name : node.callee.object?.name
        if (/sanitizer|domsanitizer/i.test(String(root ?? ''))) emit(context, node, `DomSanitizer.${method}()`)
      },
    }
  },
}

function getCalleeName(callee) {
  if (callee.type === 'Identifier') return callee.name
  if (callee.type === 'MemberExpression' && !callee.computed) return callee.property?.name
  return null
}

function emit(context, node, what) {
  report(context, {
    node,
    messageId: 'autoescapeDisabled',
    data: { what },
    severity: 'medium',
    confidence: 1,
  })
}
