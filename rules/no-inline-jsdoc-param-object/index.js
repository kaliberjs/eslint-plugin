const docsUrl = require('../../machinery/docsUrl')
const {
  getJsdocBlocks, getRelatedBlocks, getTypedTags,
  formatTypedTag, getTagLocation, buildTagFix,
  parseObjectType,
} = require('../../machinery/jsdoc')

module.exports = {
  meta: {
    type: 'suggestion',
    fixable: 'code',
    docs: {
      description:
        'Document a destructured parameter as `@param {object} name` plus dotted sub-params, instead of an inline object type',
      url: docsUrl(__dirname),
    },
    schema: [],
    messages: {
      inlineParamObject:
        'Use `@param {object} {{name}}` with a dotted `@param` per property. An inline object type is a single expression, so nothing cross-checks it against the signature.',
    },
  },

  create(context) {
    const sourceCode = context.sourceCode

    return {
      Program() {
        for (const comment of getJsdocBlocks(sourceCode)) {
          // overloads need the inline form; dotted params break resolution. The
          // implementation signature carries no `@overload` of its own, but it is
          // resolved against the blocks above it, so the whole group counts.
          if (getRelatedBlocks(sourceCode, comment).some(({ value }) => /@overload\b/.test(value))) continue

          for (const tag of getTypedTags(comment)) {
            const properties = dottedEquivalentOf(tag)
            if (properties) report({ context, sourceCode, comment, tag, properties })
          }
        }
      },
    }
  },
}

// the properties to document as dotted sub-params, or null when inline is the right form
function dottedEquivalentOf(tag) {
  if (tag.name !== 'param' || !tag.subject) return null
  if (tag.subject.includes('.')) return null   // a nested path the signature does not destructure
  // this also rules out `{ … }[]`, and any type without a plain property list
  return parseObjectType(tag.type)
}

function report({ context, sourceCode, comment, tag, properties }) {
  const lines = toDottedRows(tag, properties)
  context.report({
    loc: getTagLocation(sourceCode, comment, tag),
    messageId: 'inlineParamObject',
    data: { name: tag.subject },
    fix: buildTagFix({ sourceCode, comment, tag, lines }),
  })
}

function toDottedRows(tag, properties) {
  return [
    formatTypedTag({ ...tag, type: 'object' }),
    ...properties.map(({ key, optional: propertyOptional, type }) => formatTypedTag({
      name: tag.name,
      type,
      subject: `${tag.subject}.${key}`,
      optional: propertyOptional || tag.optional,
    })),
  ]
}
