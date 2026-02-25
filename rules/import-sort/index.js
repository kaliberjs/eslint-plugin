module.exports = {
  meta: {
    type: 'suggestion',
    fixable: 'code',
    schema: [], // Matches the structure of the working rule
    messages: {
      unsorted: 'Imports are not sorted according to the predefined groups',
    },
  },

  create(context) {
    const GROUPS = {
      OTHER: 'non-component',
      COMPONENT: 'component',
      UNIVERSAL: 'universal component',
      STYLE: 'style',
      ASSET: 'asset',
    };

    const GROUP_ORDER = [
      GROUPS.OTHER,
      GROUPS.COMPONENT,
      GROUPS.UNIVERSAL,
      GROUPS.STYLE,
      GROUPS.ASSET,
    ];

    function getGroup(path) {
      if (/\.(raw\.svg|svg|png|jpg|jpeg|gif|webp|riv)(\?.*)?$/.test(path)) return GROUPS.ASSET;
      if (path.includes('.css')) return GROUPS.STYLE;
      if (path.includes('.universal')) return GROUPS.UNIVERSAL;
      if (path.includes('/features/')) return GROUPS.COMPONENT;
      return GROUPS.OTHER;
    }

    return {
      'Program': function (node) {
        const sourceCode = context.getSourceCode();
        const imports = node.body.filter(n => n.type === 'ImportDeclaration');

        if (imports.length === 0) return;

        // Force a log to the ESLint Output channel to prove it's running
        console.log(`[ImportSort] Checking ${context.getFilename()}`);

        const importData = imports.map(n => {
          const commentsBefore = sourceCode.getCommentsBefore(n);
          const start = commentsBefore.length > 0 ? commentsBefore[0].range[0] : n.range[0];
          const end = n.range[1];
          const group = getGroup(n.source.value);

          return { node: n, text: sourceCode.text.slice(start, end), group, start, end };
        });

        // Validation Logic
        const isSorted = importData.every((data, i) => {
          if (i === 0) return true;
          const prevGroupIndex = GROUP_ORDER.indexOf(importData[i - 1].group);
          const currentGroupIndex = GROUP_ORDER.indexOf(data.group);
          return currentGroupIndex >= prevGroupIndex;
        });

        let hasNewlineIssues = false;
        for (let i = 0; i < importData.length - 1; i++) {
          const current = importData[i];
          const next = importData[i + 1];
          const textBetween = sourceCode.text.slice(current.node.range[1], next.node.range[0]);
          const newlineCount = (textBetween.match(/\n/g) || []).length;

          if (current.group === next.group) {
            if (newlineCount > 1) hasNewlineIssues = true;
          } else {
            if (newlineCount <= 1) hasNewlineIssues = true;
          }
        }

        if (!isSorted || hasNewlineIssues) {
          const firstImport = importData[0];
          const lastImport = importData[importData.length - 1];

          context.report({
            // Reporting on the first node like the todo rule reports on the comment
            node: firstImport.node,
            messageId: 'unsorted',
            fix(fixer) {
              const sortedGroups = GROUP_ORDER.map(groupName =>
                importData.filter(d => d.group === groupName)
              ).filter(g => g.length > 0);

              const fixedText = sortedGroups.map(group =>
                group.map(d => d.text).join('\n')
              ).join('\n\n');

              return fixer.replaceTextRange([firstImport.start, lastImport.end], fixedText);
            }
          });
        }
      }
    };
  }
};