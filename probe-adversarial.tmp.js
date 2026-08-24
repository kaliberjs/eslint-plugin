const { Linter } = require('eslint')
const plugin = require('.')
const { analyze } = require('./machinery/security/taint')
const { settings } = require('./machinery/security/finding')

// probe rule: reports whatever the analysis computed, floor or no floor
const probe = {
  meta: { type: 'problem', messages: { p: '{{c}}' }, schema: [] },
  create(context) {
    const analysis = analyze(context.sourceCode, settings(context))
    return {
      CallExpression(node) {
        const sink = analysis.sinkAt(node)
        if (!sink) return
        const query = node.arguments[sink.argument]
        const taint = query && analysis.taintOf(query)
        if (!taint) return context.report({ node, messageId: 'p', data: { c: `SINK(${sink.id}) but no taint` } })
        context.report({
          node: query,
          messageId: 'p',
          data: { c: `SINK(${sink.id}) conf=${taint.confidence.toFixed(3)} san=[${[...taint.sanitizedFor].join(',') || '-'}] path=${taint.path.map(h => h.kind).join('>')}` },
        })
      },
    }
  },
}

const linter = new Linter()
const config = extra => ({
  plugins: { '@kaliber': plugin, probe: { rules: { p: probe } } },
  languageOptions: { ecmaVersion: 2022, sourceType: 'module', ...extra },
  rules: { '@kaliber/no-sql-injection': 'error', 'probe/p': 'warn' },
})

const cases = require('./probe-cases.tmp.js')

let detected = 0, missed = 0
for (const [name, code, extra] of cases) {
  let messages
  try { messages = linter.verify(code, config(extra)) }
  catch (e) { console.log(`ERROR  ${name}: ${e.message}`); continue }
  const fatal = messages.filter(m => m.fatal)
  if (fatal.length) { console.log(`PARSE  ${name}: ${fatal[0].message}`); continue }
  const rule = messages.filter(m => m.ruleId === '@kaliber/no-sql-injection')
  const info = messages.filter(m => m.ruleId === 'probe/p').map(m => m.message).join(' ; ') || 'no sink/no taint at all'
  const verdict = rule.length ? 'DETECTED' : 'MISSED  '
  if (rule.length) detected++; else missed++
  console.log(`${verdict} ${name.padEnd(34)} ${info}`)
}
console.log(`\ndetected=${detected} missed=${missed} total=${detected + missed}`)
