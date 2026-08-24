const docsUrl = require('../../../machinery/docsUrl')
const { report } = require('../../../machinery/security/finding')

// node-serialize's unserialize evaluates embedded IIFEs in the payload —
// a documented RCE (CVE-2017-5941). Any call to it with non-literal input is
// arbitrary code execution by construction.

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Do not unserialize untrusted data (CWE-502)',
      url: docsUrl(__dirname),
    },
    messages: {
      unsafeUnserialize: [
        '{{ callee }} deserializes a value that is not a literal.',
        'This serializer executes code embedded in the payload; an attacker-controlled string is remote code execution.',
        'Exchange data as JSON instead.',
      ].join(' '),
    },
    schema: [],
  },

  create(context) {
    return {
      CallExpression(node) {
        const name = getCalleeName(node.callee)
        if (name !== 'unserialize') return

        const argument = node.arguments[0]
        if (!argument || argument.type === 'Literal') return

        report(context, {
          node,
          messageId: 'unsafeUnserialize',
          data: { callee: context.sourceCode.getText(node.callee) },
          severity: 'high',
          confidence: 1,
        })
      },
    }
  },
}

function getCalleeName(callee) {
  if (callee.type === 'Identifier') return callee.name
  if (callee.type === 'MemberExpression' && !callee.computed) return callee.property?.name
  return null
}
