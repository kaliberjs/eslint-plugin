const test = require('node:test')
const assert = require('node:assert')
const registry = require('./registry')

test('every sink declares a known taint kind', () => {
  // A sink that "requires general safety" is a sink whose author has not
  // decided what it is vulnerable to.
  for (const sink of registry.sinks) {
    assert.ok(sink.requires, `sink ${sink.id} has no requires`)
    assert.ok(sink.requires in registry.KINDS, `sink ${sink.id} requires unknown kind '${sink.requires}'`)
  }
})

test('every sink carries a CWE and an edition-suffixed OWASP category', () => {
  // OWASP Top 10:2025 renumbers Injection from A03 to A05, so a bare 'A03'
  // silently changes meaning. The edition suffix is mandatory.
  for (const sink of registry.sinks) {
    assert.match(sink.cwe, /^CWE-\d+$/, `sink ${sink.id} has no well-formed CWE`)
    if (sink.owasp) assert.match(sink.owasp, /^A\d{2}:\d{4}$/, `sink ${sink.id} OWASP mapping '${sink.owasp}' is missing its edition`)
  }
})

test('the wildcard sanitizer list stays short and every entry explains itself', () => {
  // A sanitizer clearing '*' silently disables detection at every sink. That is
  // the mistake that turns the plugin off without anyone noticing, so the list
  // is deliberately capped and each entry must argue why it is sound.
  const wildcards = registry.sanitizers.filter(sanitizer => sanitizer.clears.includes('*'))

  assert.ok(wildcards.length <= 6, `${wildcards.length} wildcard sanitizers is too many to review by hand`)

  for (const sanitizer of wildcards)
    assert.ok(sanitizer.note?.length > 20, `wildcard sanitizer ${sanitizer.id} must explain why clearing every kind is sound`)
})

test('no sanitizer is trusted because of its name alone', () => {
  // Per AGENTS.md: `escape`, `clean`, `sanitize` and `validate` are matched only
  // as registry entries with a known root, never as a naming convention.
  for (const sanitizer of registry.sanitizers)
    assert.ok(
      sanitizer.root.global || sanitizer.root.method || sanitizer.root.module,
      `sanitizer ${sanitizer.id} has no root to match against`
    )
})

test('a SQL escaper does not claim to clear html', () => {
  const sql = registry.sanitizers.filter(sanitizer => sanitizer.clears.includes('sql'))

  assert.ok(sql.length, 'expected at least one SQL sanitizer')
  for (const sanitizer of sql)
    assert.ok(!sanitizer.clears.includes('html'), `${sanitizer.id} must not claim to clear html`)
})

test("Prisma's safe tagged-template APIs are not sinks", () => {
  // $queryRaw and $executeRaw are tagged templates that parameterize their
  // interpolations. Flagging them is a false positive; missing
  // $queryRawUnsafe is a false negative. This is the single most important
  // correctness detail in the SQL registry.
  const matches = name => registry.sinks.some(sink => sink.root.method?.test(name))

  assert.ok(matches('$queryRawUnsafe'))
  assert.ok(matches('$executeRawUnsafe'))
  assert.ok(!matches('$queryRaw'))
  assert.ok(!matches('$executeRaw'))
})

test('a consumer cannot register a sink with a misspelled kind', () => {
  // Never matching looks exactly like being secure, so this has to throw rather
  // than quietly do nothing.
  assert.throws(
    () => registry.merge({ sinks: [{ id: 'custom', root: { method: /^run$/ }, requires: 'sqli', severity: 'high', cwe: 'CWE-89' }] }),
    /unknown kind 'sqli'/
  )
})

test('a consumer cannot register a wildcard sanitizer without justifying it', () => {
  assert.throws(
    () => registry.merge({ sanitizers: [{ id: 'custom', root: { global: 'wrap' }, argument: 0, clears: ['*'] }] }),
    /clears '\*' without a note/
  )
})

test('consumer entries take precedence over the built-in ones', () => {
  const merged = registry.merge({ sources: [{ id: 'custom.source', root: { global: 'myInput' }, path: [], confidence: 1 }] })
  assert.strictEqual(merged.sources[0].id, 'custom.source')
})
