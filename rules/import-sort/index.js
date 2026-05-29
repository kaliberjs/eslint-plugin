module.exports = {
  meta: {
    type: 'suggestion',
    fixable: 'code',
    schema: [],
    messages: {
      unsorted: 'Imports are not sorted according to the predefined groups',
    },
  },

  create(context) {
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

    function getGroup(node) {
      const path = node.source.value
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

    function getBlock(group) {
      if (group === GROUPS.NODE_PACKAGE_DEFAULT || group === GROUPS.NODE_PACKAGE_DESTRUCTURED) return 0
      if (group === GROUPS.TEMPLATES) return 1
      if (group === GROUPS.COMPONENT || group === GROUPS.UNIVERSAL_COMPONENT) return 2
      if (group === GROUPS.MACHINERY) return 3
      if (group === GROUPS.STYLE) return 4
      if (group === GROUPS.ASSET) return 5
      return 0
    }

    return {
      'Program': function (node) {
        const sourceCode = context.sourceCode
        const imports = []

        for (const n of node.body) {
          if (n.type !== 'ImportDeclaration') break
          imports.push(n)
        }

        if (imports.length === 0) return
        const hasSideEffectImport = imports.some(n => n.specifiers.length === 0)

        const importData = imports.map(n => {
          const commentsBefore = sourceCode.getCommentsBefore(n)
          const start = commentsBefore.length > 0 ? commentsBefore[0].range[0] : n.range[0]
          const end = n.range[1]
          const group = getGroup(n)

          return { node: n, text: sourceCode.text.slice(start, end), group, start, end }
        })

        const isSorted = importData.every((data, i) => {
          if (i === 0) return true
          const prevGroupIndex = GROUP_ORDER.indexOf(importData[i - 1].group)
          const currentGroupIndex = GROUP_ORDER.indexOf(data.group)
          return currentGroupIndex >= prevGroupIndex
        })

        let hasNewlineIssues = false
        for (let i = 0; i < importData.length - 1; i++) {
          const current = importData[i]
          const next = importData[i + 1]
          const textBetween = sourceCode.text.slice(current.end, next.start)
          const newlineCount = (textBetween.match(/\n/g) || []).length

          const sameBlock = getBlock(current.group) === getBlock(next.group)
          if (sameBlock) {
            if (newlineCount > 1) hasNewlineIssues = true
          } else {
            if (newlineCount <= 1) hasNewlineIssues = true
          }
        }

        if (!isSorted || hasNewlineIssues) {
          const firstImport = importData[0]
          const lastImport = importData[importData.length - 1]

          context.report({
            loc: {
              start: sourceCode.getLocFromIndex(firstImport.start),
              end: sourceCode.getLocFromIndex(lastImport.end)
            },
            messageId: 'unsorted',
            fix(fixer) {
              if (hasSideEffectImport) return null
              const sortedGroups = GROUP_ORDER.map(groupName =>
                importData.filter(d => d.group === groupName)
              ).filter(g => g.length > 0)

              const fixedText = sortedGroups.reduce((acc, group, i) => {
                const groupText = group.map(d => d.text).join('\n')
                if (i === 0) return groupText

                const prevGroup = sortedGroups[i - 1][0].group
                const currentGroup = group[0].group
                const separator = getBlock(prevGroup) === getBlock(currentGroup) ? '\n' : '\n\n'

                return acc + separator + groupText
              }, '')

              return fixer.replaceTextRange([firstImport.start, lastImport.end], fixedText)
            }
          })
        }
      }
    }
  }
}
