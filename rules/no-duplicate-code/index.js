const docsUrl = require('../../machinery/docsUrl')
const { ensureFindings } = require('./projectScanner')

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Detect code duplication across project files and suggest reuse of the canonical source',
      url: docsUrl(__dirname),
    },
    schema: [
      {
        type: 'object',
        properties: {
          minLines: {
            type: 'integer',
            minimum: 3,
            default: 6,
          },
          scanDirs: {
            type: 'array',
            items: { type: 'string' },
            default: ['src', 'config', 'services'],
          },
          type2: {
            type: 'boolean',
            default: true,
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      duplicateCode: '{{ message }}',
    },
  },

  create(context) {
    const options = context.options[0] || {}
    const minLines = options.minLines || 6
    const scanDirs = options.scanDirs || ['src', 'config', 'services']
    const type2 = options.type2 !== false  // default true

    return {
      Program() {
        const filename = context.filename || context.getFilename()
        const findings = ensureFindings(filename, { minLines, scanDirs, type2 })

        const fileFindings = findings.get(filename)
        if (!fileFindings || fileFindings.length === 0) return

        for (const finding of fileFindings) {
          context.report({
            loc: {
              start: { line: finding.line, column: 0 },
              end: { line: finding.endLine, column: 0 },
            },
            messageId: 'duplicateCode',
            data: { message: finding.message },
          })
        }
      },
    }
  },
}
