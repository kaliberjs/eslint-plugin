const docsUrl = require('../../../machinery/docsUrl')
const { report } = require('../../../machinery/security/finding')
const { importedFrom } = require('../../../machinery/security/provenance')

// node-serialize's unserialize evaluates embedded IIFEs in the payload —
// a documented RCE (CVE-2017-5941). Any call to it with non-literal input is
// arbitrary code execution by construction.
//
// Gated on the import rather than the name: this rule is in the default
// `security` preset at error level, and `unserialize(x)` is a name any
// project's own codec may use. A bare call with no visible node-serialize
// binding is a deliberate miss — see the readme.
const SERIALIZE_MODULE = /^node-serialize$/

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
        if (importedFrom(context.sourceCode, node.callee, SERIALIZE_MODULE) !== 'unserialize') return

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
