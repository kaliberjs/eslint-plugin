module.exports = {
  meta: {
    type: 'problem',
    schema: [
      {
        type: 'object',
        properties: {
          projectKeys: {
            type: 'array',
            items: { type: 'string' },
            minItems: 1,
          },
        },
        required: ['projectKeys'],
        additionalProperties: false,
      },
    ],
    messages: {
      missingTicket:
        'TODO comment must reference a Jira ticket. Use format: TODO ({{expectedKey}}-123): description',
    },
  },

  create(context) {
    const options = context.options[0] || {}
    const projectKeys = options.projectKeys || []

    if (!projectKeys.length) return {}

    const keysPattern = projectKeys.join('|')
    const todoPattern = /\btodo\b/i
    const validPattern = new RegExp(
      `\\bTODO\\s*\\(?(?:${keysPattern})-\\d+\\)?\\s*:`,
      'i'
    )

    return {
      Program() {
        const sourceCode = context.getSourceCode()
        const comments = sourceCode.getAllComments()

        for (const comment of comments) {
          if (!todoPattern.test(comment.value)) continue
          if (validPattern.test(comment.value)) continue

          context.report({
            node: comment,
            messageId: 'missingTicket',
            data: {
              expectedKey: projectKeys[0],
            },
          })
        }
      },
    }
  },
}
