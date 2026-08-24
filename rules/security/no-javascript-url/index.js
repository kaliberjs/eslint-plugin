const docsUrl = require('../../../machinery/docsUrl')
const { report } = require('../../../machinery/security/finding')

// javascript: URLs in navigation positions execute on activation. The slice
// is literal-only: a computed value needs taint tracking, which
// no-dom-xss-sink's registry can grow into later.

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Do not use javascript: URLs (CWE-83)',
      url: docsUrl(__dirname),
    },
    messages: {
      javascriptUrl: [
        "A '{{ scheme }}' URL reaches {{ where }}.",
        'It executes as code when the link or frame is activated.',
        'Use a button with an event handler instead of script URLs.',
      ].join(' '),
    },
    schema: [],
  },

  create(context) {
    return {
      Literal(node) {
        const match = /^\s*javascript:/i.exec(String(node.value ?? ''))
        if (!match) return

        const parent = node.parent

        if (parent?.type === 'JSXAttribute' && ['href', 'src', 'action', 'formAction', 'to'].includes(parent.name?.name)) {
          return emit(context, node, `the ${parent.name.name} attribute`)
        }

        if (parent?.type === 'Property') {
          const key = String(parent.key?.name ?? parent.key?.value ?? '')
          if (/^(href|src|action|formaction|to|xlink:href)$/i.test(key)) return emit(context, node, `a ${key} property`)
        }

        if (parent?.type === 'AssignmentExpression' && parent.left?.type === 'MemberExpression') {
          return emit(context, node, `an assignment to ${context.sourceCode.getText(parent.left)}`)
        }
      },
    }
  },
}

function emit(context, node, where) {
  report(context, {
    node,
    messageId: 'javascriptUrl',
    data: { scheme: 'javascript', where },
    severity: 'medium',
    confidence: 1,
  })
}
