const test = require('node:test')
const assert = require('node:assert')
const { Linter } = require('eslint')
const plugin = require('..')

// A rule key containing a slash is unreachable: ESLint's flat config reads
// everything before the last slash as the plugin name, so `@kaliber/a/b` looks
// for a plugin called `@kaliber/a`. RuleTester takes the rule object directly
// and never resolves through the namespace, so unit tests cannot catch this.
test('every registered rule can be enabled through the plugin namespace', () => {
  const linter = new Linter()
  const unreachable = []

  for (const ruleName of Object.keys(plugin.rules)) {
    const ruleId = `@kaliber/${ruleName}`
    try {
      linter.verify('', {
        plugins: { '@kaliber': plugin },
        languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
        rules: { [ruleId]: 'error' },
      })
    } catch (e) {
      unreachable.push(`${ruleId} — ${e.message.split('\n')[0]}`)
    }
  }

  assert.deepStrictEqual(unreachable, [], `unreachable rules:\n${unreachable.join('\n')}`)
})

test('no rule name contains a slash', () => {
  const withSlash = Object.keys(plugin.rules).filter(name => name.includes('/'))
  assert.deepStrictEqual(withSlash, [])
})
