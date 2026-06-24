/**
 * Tests for no-duplicate-code rule
 *
 * Two test layers:
 *   1. Engine unit tests — normalizeSource + scanForDuplication
 *   2. Integration tests — canonical source selection + finding builder
 *
 * Note: RuleTester doesn't suit this rule well because it operates on
 * the project filesystem, not individual code snippets. Engine logic
 * is tested directly with node:test instead.
 */

const { describe, it } = require('node:test')
const assert = require('node:assert/strict')
const { normalizeSource, scanForDuplication } = require('./engine')

// ─── §1: normalizeSource ────────────────────────────────────────────────────

describe('normalizeSource', () => {
  it('strips single-line comments', () => {
    const result = normalizeSource('const a = 1 // comment\nconst b = 2')
    assert.deepStrictEqual(result.map(r => r.norm), ['consta=1', 'constb=2'])
  })

  it('strips block comments', () => {
    const result = normalizeSource('const a = /* hello */ 1')
    assert.deepStrictEqual(result.map(r => r.norm), ['consta=1'])
  })

  it('strips multi-line block comments', () => {
    const result = normalizeSource('const a = 1\n/* line 1\nline 2 */\nconst b = 2')
    assert.deepStrictEqual(result.map(r => r.norm), ['consta=1', 'constb=2'])
  })

  it('collapses all whitespace', () => {
    const result = normalizeSource('  const   a  =  1  ')
    assert.deepStrictEqual(result.map(r => r.norm), ['consta=1'])
  })

  it('normalises double quotes to single quotes', () => {
    const result = normalizeSource('const a = "hello"')
    assert.deepStrictEqual(result.map(r => r.norm), ["consta='hello'"])
  })

  it('removes trailing commas before }', () => {
    const result = normalizeSource('{ a: 1, }')
    assert.deepStrictEqual(result.map(r => r.norm), ['{a:1}'])
  })

  it('removes trailing commas before ]', () => {
    const result = normalizeSource('[1, 2, ]')
    assert.deepStrictEqual(result.map(r => r.norm), ['[1,2]'])
  })

  it('removes trailing commas before )', () => {
    const result = normalizeSource('fn(a, b, )')
    assert.deepStrictEqual(result.map(r => r.norm), ['fn(a,b)'])
  })

  it('preserves correct original line numbers', () => {
    const result = normalizeSource('\n\nconst a = 1\n\nconst b = 2')
    assert.deepStrictEqual(result, [
      { norm: 'consta=1', originalLine: 3 },
      { norm: 'constb=2', originalLine: 5 },
    ])
  })

  it('handles empty input', () => {
    assert.deepStrictEqual(normalizeSource(''), [])
  })

  it('handles whitespace-only input', () => {
    assert.deepStrictEqual(normalizeSource('   \n  \n  '), [])
  })

  it('handles comment-only input', () => {
    assert.deepStrictEqual(normalizeSource('// just a comment'), [])
  })

  it('handles file without trailing newline', () => {
    const result = normalizeSource('const a = 1')
    assert.deepStrictEqual(result.map(r => r.norm), ['consta=1'])
  })

  it('preserves commas between arguments', () => {
    const result = normalizeSource('fn(a, b, c)')
    assert.deepStrictEqual(result.map(r => r.norm), ['fn(a,b,c)'])
  })

  it('handles nested comments correctly', () => {
    const result = normalizeSource('a /* // not a line comment */ b')
    assert.deepStrictEqual(result.map(r => r.norm), ['ab'])
  })

  it('handles JSDoc comments', () => {
    const result = normalizeSource('/** @param {string} x */\nfunction foo() {}')
    assert.deepStrictEqual(result.map(r => r.norm), ['functionfoo(){}'])
  })
})

// ─── §2: scanForDuplication ─────────────────────────────────────────────────

describe('scanForDuplication', () => {
  const makeBlock = (n) => Array.from({ length: n }, (_, i) => `const line${i} = ${i}`).join('\n')

  it('detects exact duplication across two files', () => {
    const block = makeBlock(6)
    const groups = scanForDuplication([
      { filePath: 'a.js', content: block },
      { filePath: 'b.js', content: block },
    ], 6)

    assert.ok(groups.length >= 1, 'Should find at least one group')
    const files = groups[0].locations.map(l => l.filePath)
    assert.ok(files.includes('a.js'))
    assert.ok(files.includes('b.js'))
  })

  it('ignores differences in whitespace', () => {
    const a = 'const x = 1\nconst y = 2\nconst z = 3\nconst w = 4\nconst v = 5\nconst u = 6'
    const b = 'const  x  =  1\nconst  y  =  2\nconst  z  =  3\nconst  w  =  4\nconst  v  =  5\nconst  u  =  6'
    const groups = scanForDuplication([
      { filePath: 'a.js', content: a },
      { filePath: 'b.js', content: b },
    ], 6)

    assert.ok(groups.length >= 1)
  })

  it('ignores differences in comments', () => {
    const a = 'const x = 1\nconst y = 2\nconst z = 3\nconst w = 4\nconst v = 5\nconst u = 6'
    const b = '// header\nconst x = 1\nconst y = 2 // inline\nconst z = 3\nconst w = 4\nconst v = 5\nconst u = 6'
    const groups = scanForDuplication([
      { filePath: 'a.js', content: a },
      { filePath: 'b.js', content: b },
    ], 6)

    assert.ok(groups.length >= 1)
  })

  it('ignores differences in quote style', () => {
    const a = "const x = 'hello'\nconst y = 'world'\nconst z = 'foo'\nconst w = 'bar'\nconst v = 'baz'\nconst u = 'qux'"
    const b = 'const x = "hello"\nconst y = "world"\nconst z = "foo"\nconst w = "bar"\nconst v = "baz"\nconst u = "qux"'
    const groups = scanForDuplication([
      { filePath: 'a.js', content: a },
      { filePath: 'b.js', content: b },
    ], 6)

    assert.ok(groups.length >= 1)
  })

  it('does not report blocks shorter than minLines', () => {
    const block = makeBlock(5)
    const groups = scanForDuplication([
      { filePath: 'a.js', content: block },
      { filePath: 'b.js', content: block },
    ], 6)

    assert.strictEqual(groups.length, 0)
  })

  it('reports blocks exactly at minLines threshold', () => {
    const block = makeBlock(6)
    const groups = scanForDuplication([
      { filePath: 'a.js', content: block },
      { filePath: 'b.js', content: block },
    ], 6)

    assert.ok(groups.length >= 1)
  })

  it('does not report unique code', () => {
    const groups = scanForDuplication([
      { filePath: 'a.js', content: makeBlock(10) },
      { filePath: 'b.js', content: Array.from({ length: 10 }, (_, i) => `const unique${i} = ${i * 100}`).join('\n') },
    ], 6)

    assert.strictEqual(groups.length, 0)
  })

  it('detects N-way duplication (3+ files)', () => {
    const block = makeBlock(6)
    const groups = scanForDuplication([
      { filePath: 'a.js', content: block },
      { filePath: 'b.js', content: block },
      { filePath: 'c.js', content: block },
    ], 6)

    assert.ok(groups.length >= 1)
    assert.ok(groups[0].locations.length >= 3)
  })

  it('merges overlapping windows into maximal clones', () => {
    const block = makeBlock(10)
    const groups = scanForDuplication([
      { filePath: 'a.js', content: block },
      { filePath: 'b.js', content: block },
    ], 6)

    // Should be merged into a single 10-line group, not 5 overlapping 6-line groups
    assert.strictEqual(groups.length, 1)
    assert.strictEqual(groups[0].locations[0].startLine, 1)
    assert.strictEqual(groups[0].locations[0].endLine, 10)
  })

  it('handles empty file list', () => {
    assert.deepStrictEqual(scanForDuplication([], 6), [])
  })

  it('handles files shorter than minLines', () => {
    const groups = scanForDuplication([
      { filePath: 'a.js', content: 'const a = 1' },
      { filePath: 'b.js', content: 'const a = 1' },
    ], 6)

    assert.strictEqual(groups.length, 0)
  })

  it('returns correct signature for expanded groups', () => {
    const block = makeBlock(8)
    const groups = scanForDuplication([
      { filePath: 'a.js', content: block },
      { filePath: 'b.js', content: block },
    ], 6)

    assert.ok(groups[0].signature.includes('constline0=0'))
    assert.ok(groups[0].signature.includes('constline7=7'))
  })
})

// ─── §3: selectCanonical ────────────────────────────────────────────────────

describe('selectCanonical', () => {
  const { selectCanonical } = require('./buildFindings')

  const loc = (filePath) => ({ filePath, startLine: 1, endLine: 10 })

  it('prefers files in shared/ directories', () => {
    const canonical = selectCanonical([
      loc('/project/src/features/Button.js'),
      loc('/project/src/shared/components/Button.js'),
    ])
    assert.ok(canonical.filePath.includes('shared'))
  })

  it('prefers files in machinery/ directories', () => {
    const canonical = selectCanonical([
      loc('/project/src/features/deep/utils.js'),
      loc('/project/src/machinery/utils.js'),
    ])
    assert.ok(canonical.filePath.includes('machinery'))
  })

  it('prefers files in lib/ directories', () => {
    const canonical = selectCanonical([
      loc('/project/src/pages/helpers.js'),
      loc('/project/src/lib/helpers.js'),
    ])
    assert.ok(canonical.filePath.includes('lib'))
  })

  it('prefers shallower path when neither is shared', () => {
    const canonical = selectCanonical([
      loc('/project/src/features/deep/nested/Component.js'),
      loc('/project/src/components/Component.js'),
    ])
    assert.strictEqual(canonical.filePath, '/project/src/components/Component.js')
  })

  it('uses alphabetical order as tiebreaker', () => {
    const canonical = selectCanonical([
      loc('/project/src/B.js'),
      loc('/project/src/A.js'),
    ])
    assert.strictEqual(canonical.filePath, '/project/src/A.js')
  })

  it('shared always beats shallow non-shared', () => {
    const canonical = selectCanonical([
      loc('/project/src/X.js'),
      loc('/project/src/features/deep/shared/X.js'),
    ])
    assert.ok(canonical.filePath.includes('shared'))
  })

  it('handles single location', () => {
    const canonical = selectCanonical([loc('/project/src/only.js')])
    assert.strictEqual(canonical.filePath, '/project/src/only.js')
  })

  it('does not mutate the input array', () => {
    const locations = [loc('/project/src/B.js'), loc('/project/src/A.js')]
    selectCanonical(locations)
    assert.strictEqual(locations[0].filePath, '/project/src/B.js')
  })
})

// ─── §4: buildFindings ──────────────────────────────────────────────────────

describe('buildFindings', () => {
  const { buildFindings } = require('./buildFindings')

  const makeGroup = (locations, lineCount = 8) => ({
    signature: Array.from({ length: lineCount }, (_, i) => `line${i}`).join('\n'),
    locations,
  })

  it('creates findings for non-canonical locations only', () => {
    const groups = [makeGroup([
      { filePath: '/project/src/shared/A.js', startLine: 1, endLine: 8 },
      { filePath: '/project/src/features/B.js', startLine: 10, endLine: 17 },
      { filePath: '/project/src/features/C.js', startLine: 5, endLine: 12 },
    ])]

    const findings = buildFindings(groups, '/project/')
    // shared/A.js is canonical — should have no findings
    assert.strictEqual(findings.has('/project/src/shared/A.js'), false)
    // B and C should have findings pointing to A
    assert.strictEqual(findings.get('/project/src/features/B.js').length, 1)
    assert.strictEqual(findings.get('/project/src/features/C.js').length, 1)
  })

  it('message includes line count and canonical reference', () => {
    const groups = [makeGroup([
      { filePath: '/project/src/shared/X.js', startLine: 1, endLine: 8 },
      { filePath: '/project/src/features/Y.js', startLine: 20, endLine: 27 },
    ])]

    const findings = buildFindings(groups, '/project/')
    const msg = findings.get('/project/src/features/Y.js')[0].message

    assert.ok(msg.includes('8 lines'), `Expected "8 lines" in: ${msg}`)
    assert.ok(msg.includes('src/shared/X.js:1-8'), `Expected canonical ref in: ${msg}`)
  })

  it('preserves correct start and end lines in findings', () => {
    const groups = [makeGroup([
      { filePath: '/project/src/shared/A.js', startLine: 1, endLine: 8 },
      { filePath: '/project/src/features/B.js', startLine: 42, endLine: 49 },
    ])]

    const findings = buildFindings(groups, '/project/')
    const finding = findings.get('/project/src/features/B.js')[0]
    assert.strictEqual(finding.line, 42)
    assert.strictEqual(finding.endLine, 49)
  })

  it('handles multiple groups for the same file', () => {
    const groups = [
      makeGroup([
        { filePath: '/project/src/shared/A.js', startLine: 1, endLine: 8 },
        { filePath: '/project/src/features/B.js', startLine: 10, endLine: 17 },
      ]),
      makeGroup([
        { filePath: '/project/src/shared/C.js', startLine: 1, endLine: 8 },
        { filePath: '/project/src/features/B.js', startLine: 30, endLine: 37 },
      ]),
    ]

    const findings = buildFindings(groups, '/project/')
    assert.strictEqual(findings.get('/project/src/features/B.js').length, 2)
  })

  it('returns empty map for empty groups', () => {
    const findings = buildFindings([], '/project/')
    assert.strictEqual(findings.size, 0)
  })

  it('strips the project prefix from canonical reference in message', () => {
    const groups = [makeGroup([
      { filePath: '/long/project/path/src/A.js', startLine: 1, endLine: 8 },
      { filePath: '/long/project/path/src/B.js', startLine: 1, endLine: 8 },
    ])]

    const findings = buildFindings(groups, '/long/project/path/')
    const msg = findings.get('/long/project/path/src/B.js')[0].message
    assert.ok(msg.includes('src/A.js'), 'Should use relative path')
    assert.ok(!msg.includes('/long/project/path'), 'Should not contain absolute prefix')
  })
})

// ─── §5: collectFiles ───────────────────────────────────────────────────────

describe('collectFiles', () => {
  const { mkdirSync, writeFileSync, rmSync } = require('node:fs')
  const { join } = require('node:path')
  const { collectFiles } = require('./collectFiles')

  const testDir = join(__dirname, '_test_fixtures')

  function setup(files) {
    rmSync(testDir, { recursive: true, force: true })
    for (const [relativePath, content] of Object.entries(files)) {
      const fullPath = join(testDir, relativePath)
      mkdirSync(join(fullPath, '..'), { recursive: true })
      writeFileSync(fullPath, content || 'const x = 1')
    }
  }

  function cleanup() {
    rmSync(testDir, { recursive: true, force: true })
  }

  it('finds .js files', () => {
    setup({ 'a.js': 'x', 'b.js': 'y' })
    const files = collectFiles(testDir)
    assert.strictEqual(files.length, 2)
    cleanup()
  })

  it('finds .jsx, .ts, .tsx, .mjs, .cjs files', () => {
    setup({
      'a.jsx': 'x', 'b.ts': 'x', 'c.tsx': 'x',
      'd.mjs': 'x', 'e.cjs': 'x',
    })
    const files = collectFiles(testDir)
    assert.strictEqual(files.length, 5)
    cleanup()
  })

  it('ignores non-JS files', () => {
    setup({ 'a.js': 'x', 'b.css': 'x', 'c.json': 'x', 'd.md': 'x' })
    const files = collectFiles(testDir)
    assert.strictEqual(files.length, 1)
    cleanup()
  })

  it('ignores node_modules', () => {
    setup({ 'a.js': 'x', 'node_modules/b.js': 'x' })
    const files = collectFiles(testDir)
    assert.strictEqual(files.length, 1)
    cleanup()
  })

  it('ignores .git and other dot directories', () => {
    setup({ 'a.js': 'x', '.git/b.js': 'x', '.cache/c.js': 'x' })
    const files = collectFiles(testDir)
    assert.strictEqual(files.length, 1)
    cleanup()
  })

  it('ignores test files', () => {
    setup({ 'a.js': 'x', 'a.test.js': 'x', 'a.spec.js': 'x' })
    const files = collectFiles(testDir)
    assert.strictEqual(files.length, 1)
    cleanup()
  })

  it('ignores .min.js files', () => {
    setup({ 'a.js': 'x', 'bundle.min.js': 'x' })
    const files = collectFiles(testDir)
    assert.strictEqual(files.length, 1)
    cleanup()
  })

  it('ignores .d.ts files', () => {
    setup({ 'a.js': 'x', 'types.d.ts': 'x' })
    const files = collectFiles(testDir)
    assert.strictEqual(files.length, 1)
    cleanup()
  })

  it('walks subdirectories recursively', () => {
    setup({ 'a.js': 'x', 'sub/b.js': 'x', 'sub/deep/c.js': 'x' })
    const files = collectFiles(testDir)
    assert.strictEqual(files.length, 3)
    cleanup()
  })

  it('returns empty array for non-existent directory', () => {
    const files = collectFiles('/does/not/exist')
    assert.deepStrictEqual(files, [])
  })

  it('returns absolute paths', () => {
    setup({ 'a.js': 'x' })
    const files = collectFiles(testDir)
    assert.ok(files[0].startsWith('/'), `Expected absolute path, got: ${files[0]}`)
    cleanup()
  })
})

// ─── §6: rule meta + schema ─────────────────────────────────────────────────

describe('rule meta + schema', () => {
  const rule = require('./index')

  it('exports type suggestion', () => {
    assert.strictEqual(rule.meta.type, 'suggestion')
  })

  it('has docs URL pointing to readme', () => {
    assert.ok(rule.meta.docs.url.includes('readme.md'))
  })

  it('has description mentioning duplication', () => {
    assert.ok(rule.meta.docs.description.includes('duplication'))
  })

  it('uses duplicateCode messageId', () => {
    assert.ok('duplicateCode' in rule.meta.messages)
  })

  it('schema accepts minLines option', () => {
    const schema = rule.meta.schema[0]
    assert.ok(schema.properties.minLines)
    assert.strictEqual(schema.properties.minLines.type, 'integer')
    assert.strictEqual(schema.properties.minLines.minimum, 3)
    assert.strictEqual(schema.properties.minLines.default, 6)
  })

  it('schema accepts scanDirs option', () => {
    const schema = rule.meta.schema[0]
    assert.ok(schema.properties.scanDirs)
    assert.strictEqual(schema.properties.scanDirs.type, 'array')
    assert.deepStrictEqual(schema.properties.scanDirs.default, ['src', 'config', 'services'])
  })

  it('schema rejects unknown properties', () => {
    const schema = rule.meta.schema[0]
    assert.strictEqual(schema.additionalProperties, false)
  })

  it('create returns a Program visitor', () => {
    const visitor = rule.create({
      filename: '/tmp/test.js',
      getFilename: () => '/tmp/test.js',
      options: [],
      report: () => {},
    })
    assert.ok('Program' in visitor)
  })

  it('create uses default options when none provided', () => {
    // Should not throw
    const visitor = rule.create({
      filename: '/tmp/test.js',
      getFilename: () => '/tmp/test.js',
      options: [],
      report: () => {},
    })
    assert.ok('Program' in visitor)
  })

  it('create accepts custom options', () => {
    const visitor = rule.create({
      filename: '/tmp/test.js',
      getFilename: () => '/tmp/test.js',
      options: [{ minLines: 10, scanDirs: ['src'] }],
      report: () => {},
    })
    assert.ok('Program' in visitor)
  })
})

// ─── §7: edge cases ────────────────────────────────────────────────────────

describe('edge cases', () => {
  it('handles JSX correctly', () => {
    const jsx = `
      function App() {
        return (
          <div className="container">
            <Header title="Hello" />
            <Content items={items} />
          </div>
        )
      }
    `
    const groups = scanForDuplication([
      { filePath: 'a.jsx', content: jsx },
      { filePath: 'b.jsx', content: jsx },
    ], 6)

    assert.ok(groups.length >= 1)
  })

  it('handles template literals', () => {
    const code = Array.from({ length: 6 }, (_, i) => `const s${i} = \`template ${i}\``).join('\n')
    const groups = scanForDuplication([
      { filePath: 'a.js', content: code },
      { filePath: 'b.js', content: code },
    ], 6)

    assert.ok(groups.length >= 1)
  })

  it('handles deeply nested code', () => {
    const nested = `
      function outer() {
        function middle() {
          function inner() {
            const a = 1
            const b = 2
            const c = 3
          }
        }
      }
    `
    const groups = scanForDuplication([
      { filePath: 'a.js', content: nested },
      { filePath: 'b.js', content: nested },
    ], 6)

    assert.ok(groups.length >= 1)
  })

  it('does not crash on binary-like content', () => {
    assert.doesNotThrow(() => {
      scanForDuplication([
        { filePath: 'a.js', content: '\x00\x01\x02\x03\x04\x05' },
        { filePath: 'b.js', content: '\x00\x01\x02\x03\x04\x05' },
      ], 6)
    })
  })

  it('does not crash on very long lines', () => {
    const longLine = 'const x = ' + 'a'.repeat(10000)
    const code = Array.from({ length: 6 }, () => longLine).join('\n')
    assert.doesNotThrow(() => {
      scanForDuplication([
        { filePath: 'a.js', content: code },
        { filePath: 'b.js', content: code },
      ], 6)
    })
  })
})

// ─── §3: Type 2 Detection (Renamed Identifiers) ────────────────────────────

describe('scanForDuplication — Type 2', () => {
  it('detects renamed variables when type2 is enabled', () => {
    const a = [
      'async function fetchUser(userId) {',
      '  const response = await fetch(userId)',
      '  const data = await response.json()',
      '  if (!data.active) {',
      '    throw new Error("not active")',
      '  }',
      '  return data',
      '}',
    ].join('\n')

    const b = [
      'async function getEmployee(employeeId) {',
      '  const result = await fetch(employeeId)',
      '  const payload = await result.json()',
      '  if (!payload.active) {',
      '    throw new Error("not active")',
      '  }',
      '  return payload',
      '}',
    ].join('\n')

    const groups = scanForDuplication([
      { filePath: 'a.js', content: a },
      { filePath: 'b.js', content: b },
    ], 6, { type2: true })

    assert.ok(groups.length >= 1, 'Should detect renamed clone')
    const type2Groups = groups.filter(g => g.detectionType === 'renamed')
    assert.ok(type2Groups.length >= 1, 'Should have at least one renamed group')
  })

  it('does NOT detect renamed variables when type2 is disabled', () => {
    const a = 'function foo(x) {\n  const a = x + 1\n  const b = a * 2\n  const c = b - 3\n  const d = c / 4\n  return d\n}'
    const b = 'function bar(y) {\n  const e = y + 1\n  const f = e * 2\n  const g = f - 3\n  const h = g / 4\n  return h\n}'

    const groups = scanForDuplication([
      { filePath: 'a.js', content: a },
      { filePath: 'b.js', content: b },
    ], 6, { type2: false })

    // Without type2, renamed identifiers should not match
    const type2Groups = groups.filter(g => g.detectionType === 'renamed')
    assert.strictEqual(type2Groups.length, 0)
  })

  it('does not double-report when Type 1 already matches', () => {
    const block = Array.from({ length: 8 }, (_, i) => `const line${i} = ${i}`).join('\n')
    const groups = scanForDuplication([
      { filePath: 'a.js', content: block },
      { filePath: 'b.js', content: block },
    ], 6, { type2: true })

    // Exact duplicates should be reported as 'exact', not 'renamed'
    const exactGroups = groups.filter(g => g.detectionType === 'exact')
    const renamedGroups = groups.filter(g => g.detectionType === 'renamed')
    assert.ok(exactGroups.length >= 1, 'Should have exact groups')
    // The exact same ranges should not also appear as renamed
    for (const rg of renamedGroups) {
      for (const loc of rg.locations) {
        const coveredByExact = exactGroups.some(eg =>
          eg.locations.some(el =>
            el.filePath === loc.filePath &&
            el.startLine === loc.startLine &&
            el.endLine === loc.endLine
          )
        )
        assert.ok(!coveredByExact, `Renamed group should not duplicate exact: ${loc.filePath}:${loc.startLine}`)
      }
    }
  })

  it('tags Type 1 groups as exact', () => {
    const block = Array.from({ length: 6 }, (_, i) => `const x${i} = ${i}`).join('\n')
    const groups = scanForDuplication([
      { filePath: 'a.js', content: block },
      { filePath: 'b.js', content: block },
    ], 6, { type2: true })

    const exactGroups = groups.filter(g => g.detectionType === 'exact')
    assert.ok(exactGroups.length >= 1, 'Exact duplicates should be tagged as exact')
  })

  it('detects renamed debounce/throttle pattern', () => {
    const a = [
      'function debounce(func, delay) {',
      '  let timer = null',
      '  return function (...args) {',
      '    clearTimeout(timer)',
      '    timer = setTimeout(() => {',
      '      func.apply(this, args)',
      '    }, delay)',
      '  }',
      '}',
    ].join('\n')

    const b = [
      'function throttle(callback, wait) {',
      '  let timeout = null',
      '  return function (...params) {',
      '    clearTimeout(timeout)',
      '    timeout = setTimeout(() => {',
      '      callback.apply(this, params)',
      '    }, wait)',
      '  }',
      '}',
    ].join('\n')

    const groups = scanForDuplication([
      { filePath: 'a.js', content: a },
      { filePath: 'b.js', content: b },
    ], 6, { type2: true })

    assert.ok(groups.some(g => g.detectionType === 'renamed'), 'Should detect renamed debounce as type 2')
  })

  it('does not match completely different code', () => {
    const a = 'function fib(n) {\n  if (n <= 1) return n\n  let prev = 0\n  let curr = 1\n  for (let i = 2; i <= n; i++) {\n    const next = prev + curr\n    prev = curr\n    curr = next\n  }\n  return curr\n}'
    const b = 'async function send(to, body) {\n  const transport = create(config)\n  const msg = { from: sender, to, html: body }\n  const result = await transport.send(msg)\n  if (result.rejected.length > 0) {\n    throw new Error("failed")\n  }\n  return result.id\n}'

    const groups = scanForDuplication([
      { filePath: 'a.js', content: a },
      { filePath: 'b.js', content: b },
    ], 6, { type2: true })

    assert.strictEqual(groups.length, 0, 'Completely different code should not match')
  })
})

// ─── §4: buildFindings — Type 2 messages ────────────────────────────────────

describe('buildFindings — Type 2 messages', () => {
  const { buildFindings } = require('./buildFindings')

  it('produces "renamed identifiers" message for Type 2 groups', () => {
    const groups = [{
      signature: 'line1\nline2\nline3\nline4\nline5\nline6',
      detectionType: 'renamed',
      locations: [
        { filePath: '/project/src/a.js', startLine: 1, endLine: 6 },
        { filePath: '/project/src/b.js', startLine: 10, endLine: 15 },
      ],
    }]

    const findings = buildFindings(groups, '/project/')
    const allMessages = []
    for (const [, fileFindings] of findings) {
      for (const f of fileFindings) allMessages.push(f.message)
    }

    assert.ok(
      allMessages.some(m => m.includes('renamed identifiers')),
      `Expected "renamed identifiers" in messages, got: ${allMessages.join('; ')}`
    )
  })

  it('produces "Duplicated code" message for Type 1 groups', () => {
    const groups = [{
      signature: 'line1\nline2\nline3\nline4\nline5\nline6',
      detectionType: 'exact',
      locations: [
        { filePath: '/project/src/a.js', startLine: 1, endLine: 6 },
        { filePath: '/project/src/b.js', startLine: 10, endLine: 15 },
      ],
    }]

    const findings = buildFindings(groups, '/project/')
    const allMessages = []
    for (const [, fileFindings] of findings) {
      for (const f of fileFindings) allMessages.push(f.message)
    }

    assert.ok(
      allMessages.some(m => m.includes('Duplicated code')),
      `Expected "Duplicated code" in messages, got: ${allMessages.join('; ')}`
    )
    assert.ok(
      !allMessages.some(m => m.includes('renamed')),
      'Type 1 messages should not mention renamed'
    )
  })
})
