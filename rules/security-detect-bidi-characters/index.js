const docsUrl = require('../../machinery/docsUrl')

const BIDI_CHARS_RE = /[\u061C\u200E\u200F\u202A\u202B\u202C\u202D\u202E\u2066\u2067\u2068\u2069]/gu

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Detects dangerous Unicode bidirectional control characters that can be used for Trojan Source attacks',
      url: docsUrl(__dirname),
    },
    schema: [],
    messages: {
      bidiCharacter: 'Dangerous Unicode bidirectional control character detected — this can be used for Trojan Source attacks',
    },
  },
  create(context) {
    return {
      Program(node) {
        const sourceCode = context.sourceCode
        const text = sourceCode.getText()
        const lines = text.split(/\r?\n/)

        for (let i = 0; i < lines.length; i++) {
          let match
          BIDI_CHARS_RE.lastIndex = 0
          while ((match = BIDI_CHARS_RE.exec(lines[i])) !== null) {
            context.report({
              loc: {
                start: { line: i + 1, column: match.index },
                end: { line: i + 1, column: match.index + 1 },
              },
              messageId: 'bidiCharacter',
            })
          }
        }
      },
    }
  },
}
