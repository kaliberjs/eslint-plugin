const { Linter } = require('eslint')
const plugin = require('.')
const linter = new Linter()

const lint = code => linter.verify(code, {
  plugins: { '@kaliber': plugin },
  languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
  rules: { '@kaliber/no-sql-injection': 'error' },
})

const cases = require('./probe-cases.tmp.js')

let fp = 0
for (const [name, code] of cases) {
  const messages = lint(code)
  const fired = messages.length > 0
  if (fired) fp++
  console.log(`${fired ? 'FALSE POSITIVE' : 'clean         '}  ${name}`)
  for (const m of messages) console.log(`      ${m.ruleId ?? 'PARSE'}: ${(m.message || '').slice(0, 200)}`)
}
console.log(`\n${fp} fired of ${cases.length}`)
