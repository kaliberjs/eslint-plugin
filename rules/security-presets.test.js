const test = require('node:test')
const assert = require('node:assert')
const fs = require('node:fs')
const path = require('node:path')
const { Linter } = require('eslint')
const plugin = require('..')

// The presets are the public entry point: a consumer writes
// `...[plugin.configs.security]` in their flat config and never registers the
// plugin themselves. RuleTester takes a rule object directly, so a preset that
// cannot resolve its own plugin passes every unit test in this repo and fails
// on the first real project. These tests use the presets the way a consumer
// does — Linter.verify with the preset as the whole config.

const BASELINE = [
  'security-no-sql-injection',
  'security-no-command-injection',
  'security-no-dom-xss-sink',
  'security-no-path-traversal',
  'security-no-firebase-path-injection',
  'security-no-groq-injection',
  'security-no-elasticsearch-injection',
  'security-no-open-redirect',
  'security-no-client-side-open-redirect',
  'security-no-ssrf',
  'security-no-node-tls-reject-unauthorized',
  'security-no-disabled-tls-verification',
  'security-no-jwt-alg-none',
  'security-no-jwt-algorithm-confusion',
  'security-no-insecure-cookie-flags',
  'security-no-unsafe-deserialization',
  'security-no-weak-key-size',
  'security-no-zip-slip',
]

const securityRules = Object.keys(plugin.rules).filter(name => name.startsWith('security-'))

test('the security preset lints without registering the plugin separately', () => {
  const messages = verify('const x = 1', plugin.configs.security)
  assert.deepStrictEqual(messages.filter(it => it.fatal), [])
})

test('the security preset reports a baseline violation', () => {
  const messages = verify(`process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'`, plugin.configs.security)
  assert.deepStrictEqual(
    messages.map(it => it.ruleId),
    ['@kaliber/security-no-node-tls-reject-unauthorized']
  )
  assert.strictEqual(messages[0].severity, 2)
})

test('the audit preset reports an audit-only violation the baseline stays quiet about', () => {
  const code = `const crypto = require('crypto'); crypto.createHash('md5').update(x)`

  assert.deepStrictEqual(verify(code, plugin.configs.security).map(it => it.ruleId), [])
  assert.deepStrictEqual(
    verify(code, plugin.configs['security-audit']).map(it => it.ruleId),
    ['@kaliber/security-no-md5']
  )
})

// Three rules watch the HTML-parser sinks: no-dom-xss-sink traces a flow into
// them, no-inner-html and no-jquery-html-sink report a non-constant value
// reaching them. Two findings on one line reads as two problems, so only the
// one that traced the flow is in the baseline.
test('the baseline reports one HTML flow once', () => {
  const code = 'function handler(req, res) { document.querySelector("#x").innerHTML = req.query.html }'

  assert.deepStrictEqual(
    verify(code, plugin.configs.security).map(it => it.ruleId),
    ['@kaliber/security-no-dom-xss-sink']
  )
  assert.deepStrictEqual(
    verify(code, plugin.configs['security-audit']).map(it => it.ruleId).sort(),
    ['@kaliber/security-no-dom-xss-sink', '@kaliber/security-no-inner-html']
  )
})

// An audit finding establishes that a value is not a constant. It has traced
// nothing, and its wording has to say so — a developer who reads "this is
// XSS" on a line that is fine stops reading the rest of the output.
test('audit-only HTML findings ask for a read rather than asserting a vulnerability', () => {
  const messages = verify(
    'el.innerHTML = renderTemplate(data)',
    plugin.configs['security-audit']
  )

  assert.strictEqual(messages.length, 1)
  assert.match(messages[0].message, /^Audit this non-constant value/)
})

test('the baseline is exactly the approved rule set', () => {
  assert.deepStrictEqual(
    Object.keys(plugin.configs.security.rules).sort(),
    BASELINE.map(name => `@kaliber/${name}`).sort()
  )
})

test('the audit preset contains every registered security rule', () => {
  const configured = Object.keys(plugin.configs['security-audit'].rules)

  assert.deepStrictEqual(
    securityRules.filter(name => !configured.includes(`@kaliber/${name}`)),
    [],
    'a security rule is registered but missing from configs[security-audit]'
  )
  assert.deepStrictEqual(
    configured.filter(id => !securityRules.includes(id.replace('@kaliber/', ''))),
    [],
    'configs[security-audit] enables a rule that is not registered'
  )
})

test('no rule in the audit preset can fail a build', () => {
  const failing = Object.entries(plugin.configs['security-audit'].rules)
    .filter(([, level]) => level !== 'warn')

  assert.deepStrictEqual(failing, [])
})

test('the baseline reserves error for findings with no dataflow to be unsure about', () => {
  const errors = Object.entries(plugin.configs.security.rules)
    .filter(([, level]) => level === 'error')
    .map(([id]) => id)

  assert.deepStrictEqual(errors.sort(), [
    '@kaliber/security-no-disabled-tls-verification',
    '@kaliber/security-no-jwt-alg-none',
    '@kaliber/security-no-node-tls-reject-unauthorized',
    '@kaliber/security-no-unsafe-deserialization',
  ])
})

// Every security readme opens with a `- **Preset:**` line. It is the first thing
// a developer reads when a rule fires at them, and it was wrong for a third of
// the rules before this test existed — the levels had been copied from an
// earlier release and never re-checked against index.js.
test('every security readme states the preset level index.js actually gives it', () => {
  const wrong = []

  for (const name of securityRules) {
    const readme = path.join(__dirname, 'security', name.replace('security-', ''), 'readme.md')
    const stated = /^- \*\*Preset:\*\* (.+)$/m.exec(fs.readFileSync(readme, 'utf8'))?.[1]
    const level = plugin.configs.security.rules[`@kaliber/${name}`]
    const expected = level
      ? `\`security\` (\`${level}\`) and \`security-audit\` (\`warn\`)`
      : '`security-audit` only (`warn`). Deliberately not in `configs.security`.'

    if (stated !== expected) wrong.push(`${name}\n  readme:   ${stated}\n  index.js: ${expected}`)
  }

  assert.deepStrictEqual(wrong, [], `readme and index.js disagree:\n${wrong.join('\n')}`)
})

// Rule counts in prose go stale the moment a rule is added, and this repo has
// already shipped three different numbers in three documents at once.
test('the documented rule count is the number of registered security rules', () => {
  const documents = ['../README.md', '../docs/research/owasp-coverage.md']

  for (const document of documents) {
    const text = fs.readFileSync(path.join(__dirname, document), 'utf8')
    const counts = [...text.matchAll(/(\d+)(?: opt-in)? (?:security )?rules?\b/g)].map(it => Number(it[1]))

    assert.ok(counts.length, `${document} states no rule count at all`)
    assert.deepStrictEqual(
      [...new Set(counts.filter(count => count !== securityRules.length))],
      [],
      `${document} states a rule count that is not ${securityRules.length}`
    )
  }
})

function verify(code, config) {
  return new Linter().verify(code, config, 'file.js')
}
