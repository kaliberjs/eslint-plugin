const docsUrl = require('../../../machinery/docsUrl')
const { report } = require('../../../machinery/security/finding')

// Enabling entity expansion in an XML parser re-opens billion-laughs denial
// of service and external-entity file reads (XXE). The slice below covers
// libxml-js's option shape; parsers that disable entities by default are
// deliberately not flagged.

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Do not enable XML entity expansion or DTD loading (CWE-611)',
      url: docsUrl(__dirname),
    },
    messages: {
      entityExpansion: [
        "XML parsing option '{{ key }}' enables entity processing.",
        'External entities allow file reads from the server and entity-expansion denial of service.',
        'Parse without entity expansion; if entities are unavoidable, use a fixed substitution map.',
      ].join(' '),
    },
    schema: [],
  },

  create(context) {
    return {
      Property(node) {
        if (node.computed || !/^(noent|dtdload|dtdvalid)$/i.test(String(node.key?.name ?? ''))) return
        if (node.value?.type !== 'Literal' || node.value.value !== true) return

        report(context, {
          node,
          messageId: 'entityExpansion',
          data: { key: String(node.key.name) },
          severity: 'high',
          confidence: 1,
        })
      },
    }
  },
}
