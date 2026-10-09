const docsUrl = require('../../machinery/docsUrl')
const { forEachShape } = require('../../machinery/firebase-rules')
const { otherFindingOf, childrenFindingOf } = require('../../machinery/firebase-shapes')

// Data only our own code writes (a service, or the server as `serve`) can't be abused by users,
// so its shape is best practice rather than a hole: the same checks as firebase-other-required
// and firebase-children-required, as a warning, with the same fixes.

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'suggestion',
    fixable: 'code',
    docs: {
      description: 'Recommend `$other` and `newData.hasChildren()` on Firebase data only our own ' +
        'code writes, as for data users write',
      url: docsUrl(__dirname),
    },
    messages: {
      otherRequired: '`{{path}}`: only our own code writes here, but unlisted keys aren\'t ' +
        'closed. Best practice: add `\'$other\': {{closing}}`.',
      otherService: '`{{path}}`: only our own code writes here; best practice is to let only ' +
        '{{service}} add unlisted keys: `{{expected}}`.',
      otherClosed: '`{{path}}`: only our own code writes here; best practice is to close this ' +
        'data to unlisted keys: `{{expected}}`.',
      childrenRequired: '`{{path}}`: only our own code writes here, but a plain string or number ' +
        'would still pass. Best practice: add `\'.validate\': \'newData.hasChildren()\'`.',
    },
    schema: [],
  },

  create(context) {
    const { sourceCode } = context

    return forEachShape(context, shape => {
      if (shape.openToClients) return

      const findings = [otherFindingOf(shape, sourceCode), childrenFindingOf(shape, sourceCode)]

      for (const finding of findings) if (finding) context.report(finding)
    })
  },
}
