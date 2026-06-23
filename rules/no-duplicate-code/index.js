const docsUrl = require('../../machinery/docsUrl')
const { ensureFindings } = require('./projectScanner')

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Detect code duplication across project files and suggest reuse of the canonical source',
      url: docsUrl(__dirname),
    },
    schema: [],
    messages: {
      duplicateCode: '{{ message }}',
    },
  },

  create(context) {
    return {
      Program() {
        const filename = context.filename || context.getFilename()
        const findings = ensureFindings(filename)

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
