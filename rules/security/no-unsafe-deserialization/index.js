const { findVariable } = require('@eslint-community/eslint-utils')
const docsUrl = require('../../../machinery/docsUrl')
const { report } = require('../../../machinery/security/finding')

// node-serialize's unserialize evaluates embedded IIFEs in the payload —
// a documented RCE (CVE-2017-5941). Any call to it with non-literal input is
// arbitrary code execution by construction.
const SERIALIZE_MODULES = /^node-serialize$/

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
        // Bare name match, or a renamed import proven to come from
        // node-serialize's actual export: `const { unserialize: u } =
        // require('node-serialize'); u(x)`.
        if (name !== 'unserialize' && importedUnserializeName(context, node.callee) !== 'unserialize') return

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

/** The name this identifier was imported/destructured as from node-serialize, or null. */
function importedUnserializeName(context, callee) {
  if (callee.type !== 'Identifier') return null

  const variable = findVariable(context.sourceCode.getScope(callee), callee)
  const definition = variable?.defs[0]
  if (!definition) return null

  if (definition.type === 'ImportBinding') {
    if (!SERIALIZE_MODULES.test(String(definition.parent.source.value))) return null
    const imported = definition.node.imported
    return imported?.type === 'Identifier' ? imported.name : (imported?.value ?? null)
  }

  if (definition.type === 'Variable') {
    const init = definition.node.init
    const isRequireOfSerializeModule = init?.type === 'CallExpression'
      && init.callee?.type === 'Identifier' && init.callee.name === 'require'
      && init.arguments[0]?.type === 'Literal'
      && SERIALIZE_MODULES.test(String(init.arguments[0].value))
    if (!isRequireOfSerializeModule) return null

    const property = definition.name.parent
    if (property?.type !== 'Property') return null
    if (property.key?.type === 'Identifier') return property.key.name
    return property.key?.type === 'Literal' ? String(property.key.value) : null
  }

  return null
}
