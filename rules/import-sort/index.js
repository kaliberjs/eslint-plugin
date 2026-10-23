/** @import { AST, Rule } from 'eslint' */
/** @import { Comment, ImportDeclaration, Program } from 'estree' */

const docsUrl = require('../../machinery/docsUrl')

/** @type {Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'suggestion',
    fixable: 'code',
    docs: {
      description: 'Enforce grouped and ordered import statements with auto-fix support',
      url: docsUrl(__dirname),
    },
    schema: [],
    messages: {
      unsorted: 'Imports are not sorted according to the predefined groups',
    },
  },

  create(context) {
    const sourceCode = context.sourceCode

    const GROUPS = {
      NODE_PACKAGE_DEFAULT: 'node-package-default',
      NODE_PACKAGE_DESTRUCTURED: 'node-package-destructured',
      TEMPLATES: 'templates',
      MACHINERY: 'machinery',
      COMPONENT: 'component',
      UNIVERSAL_COMPONENT: 'universal-component',
      STYLE: 'style',
      ASSET: 'asset',
    }

    const GROUP_ORDER = [
      GROUPS.NODE_PACKAGE_DEFAULT,
      GROUPS.NODE_PACKAGE_DESTRUCTURED,
      GROUPS.TEMPLATES,
      GROUPS.COMPONENT,
      GROUPS.UNIVERSAL_COMPONENT,
      GROUPS.MACHINERY,
      GROUPS.STYLE,
      GROUPS.ASSET,
    ]

    return {
      'Program': (program) => {
        const imports = getLeadingImports(program)
        if (imports.length === 0) return

        const importTags = sourceCode.getAllComments().filter(isImportTag)
        const importData = imports.map((node, i) => toImportData(node, { isFirstImport: i === 0, importTags }))
        const firstImport = importData[0]
        const lastImport = importData[importData.length - 1]
        const misplacedImportTags = importTags.filter(tag => getRange(tag)[0] > firstImport.start)

        const isValid =
          isSortedByGroup(importData) &&
          hasCorrectBlankLines(importData) &&
          misplacedImportTags.length === 0
        if (isValid) return

        context.report({
          loc: {
            start: sourceCode.getLocFromIndex(firstImport.start),
            end: sourceCode.getLocFromIndex(lastImport.end)
          },
          messageId: 'unsorted',
          fix(fixer) {
            if (hasSideEffectImport(imports)) return null

            const sortedImportsText = withImportTagsOnTop(getSortedImportsText(importData), misplacedImportTags)
            const importTagsAfterImports = misplacedImportTags.filter(tag => getRange(tag)[0] >= lastImport.end)

            return [
              fixer.replaceTextRange([firstImport.start, lastImport.end], sortedImportsText),
              ...importTagsAfterImports.map(tag => fixer.removeRange(getRemovalRange(tag))),
            ]
          }
        })
      }
    }

    /**
     * @param {ImportDeclaration} node
     * @returns {string}
     */
    function getGroup(node) {
      const path = String(node.source.value)
      if (/\.(raw\.svg|svg|png|jpg|jpeg|gif|webp|riv)(\?.*)?$/.test(path)) return GROUPS.ASSET
      if (path.includes('.css')) return GROUPS.STYLE
      if (path.includes('.universal')) return GROUPS.UNIVERSAL_COMPONENT
      if (path.includes('/features/')) return GROUPS.COMPONENT
      if (path.includes('/templates/') || path.includes('/pages/')) return GROUPS.TEMPLATES
      if (path.includes('/machinery/') || path.includes('/i18n/')) return GROUPS.MACHINERY

      const isExternal = !path.startsWith('/') && !path.startsWith('.')
      if (isExternal) {
        const hasDestructuring = node.specifiers.some(s => s.type === 'ImportSpecifier')
        return hasDestructuring ? GROUPS.NODE_PACKAGE_DESTRUCTURED : GROUPS.NODE_PACKAGE_DEFAULT
      }

      return GROUPS.MACHINERY
    }

    /**
     * @param {string} group
     * @returns {number}
     */
    function getBlock(group) {
      if (group === GROUPS.NODE_PACKAGE_DEFAULT || group === GROUPS.NODE_PACKAGE_DESTRUCTURED) return 0
      if (group === GROUPS.TEMPLATES) return 1
      if (group === GROUPS.COMPONENT || group === GROUPS.UNIVERSAL_COMPONENT) return 2
      if (group === GROUPS.MACHINERY) return 3
      if (group === GROUPS.STYLE) return 4
      if (group === GROUPS.ASSET) return 5
      return 0
    }

    /**
     * @param {string} group
     * @param {string} otherGroup
     */
    function isSameBlock(group, otherGroup) {
      return getBlock(group) === getBlock(otherGroup)
    }

    /** @param {Program} program */
    function getLeadingImports(program) {
      /** @type {ImportDeclaration[]} */
      const imports = []
      for (const node of program.body) {
        if (node.type !== 'ImportDeclaration') break
        imports.push(node)
      }
      return imports
    }

    /** @param {ImportDeclaration[]} imports */
    function hasSideEffectImport(imports) {
      return imports.some(node => node.specifiers.length === 0)
    }

    /**
     * @param {ImportDeclaration} node
     * @param {{ isFirstImport: boolean, importTags: Comment[] }} options
     * @returns {ImportData}
     */
    function toImportData(node, { isFirstImport, importTags }) {
      const leadingComments = getLeadingComments(node, isFirstImport)
      const start = leadingComments.length > 0 ? getRange(leadingComments[0])[0] : getRange(node)[0]
      const end = getRange(node)[1]

      return { group: getGroup(node), text: getTextWithoutImportTags([start, end], importTags), start, end }
    }

    /**
     * Comments that move along with the import when it is sorted. For the first import,
     * comments above its last `@import` tag are the file header and stay where they are.
     *
     * @param {ImportDeclaration} node
     * @param {boolean} isFirstImport
     */
    function getLeadingComments(node, isFirstImport) {
      const comments = sourceCode.getCommentsBefore(node)
      const fileHeaderLength = isFirstImport ? comments.findLastIndex(isImportTag) + 1 : 0
      return comments.slice(fileHeaderLength).filter(comment => !isImportTag(comment))
    }

    /** @param {ImportData[]} importData */
    function isSortedByGroup(importData) {
      return importData.slice(1).every((current, i) => {
        const previous = importData[i]
        return GROUP_ORDER.indexOf(previous.group) <= GROUP_ORDER.indexOf(current.group)
      })
    }

    /** @param {ImportData[]} importData */
    function hasCorrectBlankLines(importData) {
      return importData.slice(1).every((current, i) => {
        const previous = importData[i]
        const newlineCount = countNewlines(sourceCode.text.slice(previous.end, current.start))
        return isSameBlock(previous.group, current.group) ? newlineCount <= 1 : newlineCount > 1
      })
    }

    /**
     * @param {ImportData[]} importData
     * @returns {string}
     */
    function getSortedImportsText(importData) {
      const sortedGroups = GROUP_ORDER
        .map(group => importData.filter(data => data.group === group))
        .filter(groupImports => groupImports.length > 0)

      return sortedGroups
        .map((groupImports, i) => {
          const groupText = groupImports.map(data => data.text).join('\n')
          if (i === 0) return groupText

          const previousGroup = sortedGroups[i - 1][0].group
          const separator = isSameBlock(previousGroup, groupImports[0].group) ? '\n' : '\n\n'
          return separator + groupText
        })
        .join('')
    }

    /**
     * @param {string} importsText
     * @param {Comment[]} importTags
     */
    function withImportTagsOnTop(importsText, importTags) {
      if (importTags.length === 0) return importsText

      const importTagsText = importTags.map(tag => sourceCode.text.slice(...getRange(tag))).join('\n')
      return importTagsText + '\n\n' + importsText
    }

    /**
     * @param {AST.Range} range
     * @param {Comment[]} importTags
     */
    function getTextWithoutImportTags([start, end], importTags) {
      const removalRanges = importTags
        .filter(tag => getRange(tag)[0] >= start && getRange(tag)[1] <= end)
        .map(getRemovalRange)

      let text = ''
      let position = start
      for (const [removalStart, removalEnd] of removalRanges) {
        text += sourceCode.text.slice(position, removalStart)
        position = removalEnd
      }
      return text + sourceCode.text.slice(position, end)
    }

    /**
     * A comment on its own line is removed with its line. A comment after code on the
     * same line is removed with the whitespace before it, so the lines stay apart.
     *
     * @param {Comment} comment
     * @returns {AST.Range}
     */
    function getRemovalRange(comment) {
      const { text } = sourceCode
      const [commentStart, commentEnd] = getRange(comment)
      const lineStart = text.lastIndexOf('\n', commentStart - 1) + 1
      const textBefore = text.slice(lineStart, commentStart)

      const isAloneOnLine = !textBefore.trim()
      if (!isAloneOnLine) return [lineStart + textBefore.trimEnd().length, commentEnd]

      const restOfLine = text.slice(commentEnd).match(/^[ \t]*\n?/)?.[0] ?? ''
      return [lineStart, commentEnd + restOfLine.length]
    }
  }
}

/** @param {Comment} comment */
function isImportTag(comment) {
  return comment.type === 'Block' && comment.value.startsWith('*') && /@import\b/.test(comment.value)
}

/** @param {string} text */
function countNewlines(text) {
  return (text.match(/\n/g) || []).length
}

/**
 * ESLint always sets `range`, estree types it as optional.
 *
 * @param {Comment | ImportDeclaration} node
 * @returns {AST.Range}
 */
function getRange(node) {
  return /** @type {AST.Range} */ (node.range)
}

/**
 * @typedef {{
 *   group: string,
 *   text: string,
 *   start: number,
 *   end: number,
 * }} ImportData
 */
