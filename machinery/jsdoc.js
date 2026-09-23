const { getIndentation } = require('./ast')

module.exports = {
  isJsdocBlock, getJsdocBlocks, getRelatedBlocks,
  getTypedTags, formatTypedTag, getTagLocation, buildTagFix,
  parseObjectType,
}

function isJsdocBlock(comment) {
  return comment.type === 'Block' && comment.value.startsWith('*')
}

function getJsdocBlocks(sourceCode) {
  return sourceCode.getAllComments().filter(isJsdocBlock)
}

/**
 * Every jsdoc block documenting the same declaration, the given one included.
 * A declaration can carry several: `@overload` signatures above the implementation.
 *
 * @param {object} sourceCode
 * @param {object} comment
 */
function getRelatedBlocks(sourceCode, comment) {
  const token = sourceCode.getTokenAfter(comment, { includeComments: false })
  if (!token) return [comment]
  return sourceCode.getCommentsBefore(token).filter(isJsdocBlock)
}

/**
 * Every tag in the block that carries a `{type}`, with the parts that follow it.
 * Offsets are relative to `comment.value`.
 *
 * @param {object} comment
 */
function getTypedTags(comment) {
  const value = comment.value
  const tags = []
  const pattern = /@(\w+)[ \t]+\{/g
  let match

  while ((match = pattern.exec(value))) {
    const [tag, name] = match
    const typeStart = match.index + tag.length - 1
    const typeEnd = matchingBrace(value, typeStart)
    if (typeEnd === -1) continue

    pattern.lastIndex = typeEnd
    const rest = /^[ \t]+(\[?)([A-Za-z_$][\w$.]*)(\]?)([^\n]*)/.exec(value.slice(typeEnd + 1))
    // an optional name is wrapped in brackets, so a lone bracket is not parseable
    if (rest && Boolean(rest[1]) !== Boolean(rest[3])) continue

    tags.push({
      name,
      type: value.slice(typeStart + 1, typeEnd).trim(),
      subject: rest && rest[2],
      optional: Boolean(rest && rest[1]),
      description: rest ? rest[4].replace(/\s+$/, '') : '',
      start: match.index,
      end: typeEnd + 1 + (rest ? rest[0].length : 0),
    })
  }

  return tags
}

function formatTypedTag({ name, type, subject, optional, description = '' }) {
  const formattedSubject = optional ? `[${subject}]` : subject
  return `@${name} {${type}}${formattedSubject ? ` ${formattedSubject}` : ''}${description}`
}

function getTagLocation(sourceCode, comment, tag) {
  const [start, end] = toSourceRange(comment, tag)
  return {
    start: sourceCode.getLocFromIndex(start),
    end: sourceCode.getLocFromIndex(end),
  }
}

function buildTagFix({ sourceCode, comment, tag, lines }) {
  const value = comment.value
  const lineStart = value.lastIndexOf('\n', tag.start) + 1
  const prefix = value.slice(lineStart, tag.start)

  // inside a multi-line block: reuse the existing ` * ` prefix verbatim
  if (lineStart > 0 && /^[ \t]*\*[ \t]*$/.test(prefix))
    return fixer => fixer.replaceTextRange(
      toSourceRange(comment, tag),
      lines.join(`\n${prefix}`)
    )

  // single-line block: expand it, but only when it holds nothing else
  if (value.slice(1, tag.start).trim() === '' && value.slice(tag.end).trim() === '') {
    const indent = getIndentation(sourceCode, comment)
    const body = lines.map(line => `${indent} * ${line}`).join('\n')
    return fixer => fixer.replaceText(comment, `/**\n${body}\n${indent} */`)
  }

  return null
}

function toSourceRange(comment, { start, end }) {
  return [toSourceIndex(comment, start), toSourceIndex(comment, end)]
}

// offsets from `getTypedTags` index into `comment.value`, which drops the leading `/*`
function toSourceIndex(comment, offset) {
  return comment.range[0] + '/*'.length + offset
}

/**
 * The members of an object literal type, or null when it has no equivalent
 * property list — an index signature, an intersection, a spread.
 *
 * @param {string} type
 */
function parseObjectType(type) {
  if (!type.startsWith('{') || !type.endsWith('}')) return null

  const properties = []
  // a type spread over several lines carries ` * ` continuation prefixes
  for (const part of splitTopLevel(collapse(type.slice(1, -1)))) {
    const member = /^\s*([A-Za-z_$][\w$]*)(\?)?\s*:\s*([\s\S]+?)\s*$/.exec(part)
    if (!member) return null
    const propertyType = collapse(member[3])
    if (splitTopLevel(propertyType).length > 1) return null   // a separator we failed to account for
    properties.push({ key: member[1], optional: Boolean(member[2]), type: propertyType })
  }

  return properties.length ? properties : null
}

function collapse(text) {
  return text.replace(/\n[ \t]*\*[ \t]*/g, ' ').trim()
}

function matchingBrace(text, start) {
  for (const { index, character, depth, inString } of scan(text, start))
    if (!inString && character === '}' && depth === 0) return index

  return -1
}

// TypeScript accepts both `,` and `;` between the members of an object type
function splitTopLevel(body) {
  const parts = []
  let start = 0

  for (const { index, character, depth, inString } of scan(body))
    if (!inString && depth === 0 && (character === ',' || character === ';')) {
      parts.push(body.slice(start, index))
      start = index + 1
    }

  parts.push(body.slice(start))
  // a trailing separator is legal, so empty members are not a parse failure
  return parts.filter(part => part.trim())
}

// walks a type expression, reporting the bracket depth at every character
function* scan(text, from = 0) {
  let depth = 0
  let previous = ''
  let quote = ''
  let escaped = false

  for (let index = from; index < text.length; index++) {
    const character = text[index]
    // a literal type can hold a bracket or a separator: `{ mode: '>' }`
    if (quote) {
      if (escaped) escaped = false
      else if (character === '\\') escaped = true
      else if (character === quote) quote = ''
    }
    else if (`'"\``.includes(character)) quote = character
    else if ('<({['.includes(character)) depth++
    // `=>` is an arrow, not a closing angle bracket
    else if (')}]'.includes(character) || (character === '>' && previous !== '=')) depth = Math.max(0, depth - 1)

    yield { index, character, depth, inString: Boolean(quote) }
    previous = character
  }
}
