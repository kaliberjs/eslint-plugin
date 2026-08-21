const docsUrl = require('../../machinery/docsUrl')

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
        for (const comment of sourceCode.getAllComments()) {
          if (comment.type !== 'Block' || !comment.value.startsWith('*')) continue
          // overloads need the inline form; dotted params break resolution. This
          // covers the implementation signature too, whose own block carries no
          // `@overload` but which is resolved against the ones above it.
          if (documentsAnOverload(sourceCode, comment)) continue

          for (const site of findInlineParamObjects(comment.value)) {
            report({ context, sourceCode, comment, site })
          }
        }
      },
    }
  },
}

function documentsAnOverload(sourceCode, comment) {
  if (/@overload\b/.test(comment.value)) return true

  const token = sourceCode.getTokenAfter(comment, { includeComments: false })
  if (!token) return false

  return sourceCode
    .getCommentsBefore(token)
    .some(other => /@overload\b/.test(other.value))
}

function report({ context, sourceCode, comment, site }) {
  const toIndex = offset => comment.range[0] + 2 + offset
  const rows = toDottedRows(site)

  context.report({
    loc: {
      start: sourceCode.getLocFromIndex(toIndex(site.start)),
      end: sourceCode.getLocFromIndex(toIndex(site.end)),
    },
    messageId: 'inlineParamObject',
    data: { name: site.name },
    fix: buildFix({ sourceCode, comment, site, rows, toIndex }),
  })
}

function buildFix({ sourceCode, comment, site, rows, toIndex }) {
  if (!rows) return null

  const value = comment.value
  const lineStart = value.lastIndexOf('\n', site.start) + 1
  const prefix = value.slice(lineStart, site.start)

  // inside a multi-line block: reuse the existing ` * ` prefix verbatim
  if (lineStart > 0 && /^[ \t]*\*[ \t]*$/.test(prefix))
    return fixer => fixer.replaceTextRange(
      [toIndex(site.start), toIndex(site.end)],
      rows.join(`\n${prefix}`)
    )

  // single-line block: expand it, but only when it holds nothing else
  if (value.slice(1, site.start).trim() === '' && value.slice(site.end).trim() === '') {
    const indent = indentOf(sourceCode, comment)
    const body = rows.map(row => `${indent} * ${row}`).join('\n')
    return fixer => fixer.replaceText(comment, `/**\n${body}\n${indent} */`)
  }

  return null
}

function indentOf(sourceCode, comment) {
  const text = sourceCode.getText()
  const start = text.lastIndexOf('\n', comment.range[0]) + 1
  return text.slice(start, comment.range[0]).match(/^[ \t]*/)[0]
}

function toDottedRows({ name, optional, properties, description }) {
  if (!properties) return null

  const root = optional ? `[${name}]` : name
  return [
    `@param {object} ${root}${description}`,
    ...properties.map(({ key, optional: propOptional, type }) => {
      const ref = `${name}.${key}`
      // a child of an optional root has to be optional too
      return `@param {${type}} ${propOptional || optional ? `[${ref}]` : ref}`
    }),
  ]
}

function findInlineParamObjects(value) {
  const sites = []
  const tag = /@param[ \t]+\{/g
  let match

  while ((match = tag.exec(value))) {
    const typeStart = match.index + match[0].length - 1
    const typeEnd = matchingBrace(value, typeStart)
    if (typeEnd === -1) continue

    const type = value.slice(typeStart + 1, typeEnd).trim()
    // only an object literal type; `{ … }[]` cannot be expressed dotted
    if (!type.startsWith('{') || !type.endsWith('}')) continue

    const rest = /^[ \t]+(\[?)([A-Za-z_$][\w$.]*)(\]?)([^\n]*)/.exec(value.slice(typeEnd + 1))
    if (!rest) continue

    const [whole, open, name, close, trailing] = rest
    if (name.includes('.')) continue          // nested path: inline is correct
    if (Boolean(open) !== Boolean(close)) continue

    // if it cannot be written as dotted sub-params, inline is the right form
    const properties = parseProperties(type.slice(1, -1))
    if (!properties) continue

    sites.push({
      start: match.index,
      end: typeEnd + 1 + whole.length,
      name,
      optional: Boolean(open),
      description: trailing.replace(/\s+$/, ''),
      properties,
    })
    tag.lastIndex = typeEnd
  }

  return sites
}

function parseProperties(rawBody) {
  const properties = []
  // a multi-line type carries ` * ` continuation prefixes
  const body = collapse(rawBody)

  for (const part of splitTopLevel(body)) {
    const match = /^\s*([A-Za-z_$][\w$]*)(\?)?\s*:\s*([\s\S]+?)\s*$/.exec(part)
    if (!match) return null                   // index signature, spread, intersection…
    const type = collapse(match[3])
    if (splitTopLevel(type).length > 1) return null   // a comma we failed to account for
    properties.push({ key: match[1], optional: Boolean(match[2]), type })
  }

  return properties.length ? properties : null
}

function collapse(text) {
  return text.replace(/\n[ \t]*\*[ \t]*/g, ' ').trim()
}

function splitTopLevel(body) {
  const parts = []
  let depth = 0
  let current = ''
  let previous = ''

  for (const character of body) {
    if ('<({['.includes(character)) depth++
    else if (')}]'.includes(character)) depth = Math.max(0, depth - 1)
    // `=>` is an arrow, not a closing angle bracket
    else if (character === '>' && previous !== '=') depth = Math.max(0, depth - 1)

    if (character === ',' && depth === 0) {
      parts.push(current)
      current = ''
    } else current += character

    previous = character
  }

  if (current.trim()) parts.push(current)
  return parts
}

function matchingBrace(text, start) {
  let depth = 0

  for (let i = start; i < text.length; i++) {
    if (text[i] === '{') depth++
    else if (text[i] === '}' && --depth === 0) return i
  }

  return -1
}
