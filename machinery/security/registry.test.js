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
  // The previous version of this test asserted that `root.method` *exists* —
  // that is, it passed precisely *because* a sanitizer was name-matched. It was
  // the inverse of the rule it claimed to enforce, and mysql.escape passed it.
  //
  // Per AGENTS.md a function is never a sanitizer because of what it is called.
  // A method name is only acceptable when paired with a receiver constraint;
  // otherwise the entry must be rooted in a module, a global, or an explicit
  // `root.helper` — the shape that exists precisely to record "trusting this
  // bare name was a conscious decision" rather than an accident.
  for (const sanitizer of registry.sanitizers) {
    if (sanitizer.root.method)
      assert.ok(sanitizer.root.receiver, `sanitizer ${sanitizer.id} is matched by bare method name — it needs a receiver constraint`)
    else
      assert.ok(sanitizer.root.global || sanitizer.root.module || sanitizer.root.helper, `sanitizer ${sanitizer.id} has no root to match against`)
  }
})

test('a consumer cannot register a bare method-name sanitizer either', () => {
  assert.throws(
    () => registry.merge({ sanitizers: [{ id: 'custom', root: { method: /^clean$/ }, argument: 0, clears: ['sql'] }] }),
    /matched by method name with no `receiver` constraint/
  )
})

test('a consumer cannot register a sink with an unrecognised severity', () => {
  // `critical` was silently unreportable: REPORTABLE had no such key, so the
  // lookup returned undefined and every finding was dropped without a word.
  assert.doesNotThrow(() => registry.merge({ sinks: [{ id: 'c', root: { method: /^run$/ }, requires: 'sql', severity: 'critical', cwe: 'CWE-89' }] }))
  assert.throws(
    () => registry.merge({ sinks: [{ id: 'c', root: { method: /^run$/ }, requires: 'sql', severity: 'catastrophic', cwe: 'CWE-89' }] }),
    /no report decision recognises/
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
