const { getStaticValue } = require('@eslint-community/eslint-utils')
const { getStaticPropertyName } = require('../../../machinery/ast')
const docsUrl = require('../../../machinery/docsUrl')
const { report } = require('../../../machinery/security/finding')

// spawn/spawnSync/execFile/execFileSync exist to run a program without a
// shell; passing shell: true silently re-introduces the shell and makes the
// argv array subject to metacharacter interpretation again.
const SHELL_EXECUTORS = new Set(['spawn', 'spawnSync', 'execFile', 'execFileSync', 'execa'])

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Do not pass shell: true to spawn / execFile / execa (CWE-78)',
      url: docsUrl(__dirname),
    },
    messages: {
      shellTrue: [
        '{{ callee }}() with shell: true runs the command through a shell.',
        'The argument array becomes subject to shell metacharacter interpretation, which re-introduces command injection risk that these APIs exist to avoid.',
        'If shell features (globbing, pipes) are needed, invoke sh -c explicitly with a fully literal command string.',
      ].join(' '),
    },
    // A suggestion rather than a fix could drop the option, but whether the
    // command still works without a shell depends on what it invokes.
    hasSuggestions: false,
    schema: [],
  },

  create(context) {
    return {
      CallExpression(node) {
        const callee = node.callee
        const name = callee.type === 'MemberExpression' && !callee.computed ? callee.property.name : callee.name
        if (!SHELL_EXECUTORS.has(name)) return

        // execa takes the options object as the second or third argument;
        // child_process puts it last. Scan every object-literal argument so
        // position differences do not become misses.
        for (const arg of node.arguments) {
          if (arg.type !== 'ObjectExpression') continue

          const shell = arg.properties.find(
            property => property.type === 'Property' && getStaticPropertyName(property) === 'shell'
          )

          if (!shell) continue

          const value = getStaticValue(shell.value, context.sourceCode.getScope(shell.value))
          if (value && value.value !== false && value.value !== '') {
            report(context, {
              node: shell,
              messageId: 'shellTrue',
              data: { callee: name },
              severity: 'medium',
              confidence: 1,
            })
            return
          }
        }
      },
    }
  },
}
