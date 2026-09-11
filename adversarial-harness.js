const { Linter } = require('eslint')

function run(ruleName, code) {
  const linter = new Linter()
  const rule = require(`/Volumes/Development/eslint-plugin/rules/security/${ruleName}`)
  return linter.verify(code, {
    plugins: { x: { rules: { t: rule } } },
    rules: { 'x/t': 'warn' },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { window: 'readonly', location: 'readonly', document: 'readonly', self: 'readonly', globalThis: 'readonly', process: 'readonly', console: 'readonly', fetch: 'readonly' },
    },
  })
}

module.exports = { run }

if (require.main === module) {
  const [ruleName, ...rest] = process.argv.slice(2)
  const code = rest.join(' ')
  try {
    const msgs = run(ruleName, code)
    console.log(JSON.stringify(msgs.map(m => ({ id: m.ruleId, msg: m.message })), null, 1))
  } catch (e) {
    console.log('THREW:', e.message)
  }
}
