const { describe, it, afterEach } = require('node:test')
const assert = require('node:assert')
const { writeFileSync, mkdirSync, rmSync } = require('node:fs')
const { join } = require('node:path')
const { getImportGraph, _resetCache } = require('./importGraph')

const fixtureRoot = join(__dirname, '..', '.test-fixtures', 'import-graph')

afterEach(() => {
  _resetCache()
  try { rmSync(fixtureRoot, { recursive: true, force: true }) } catch {}
})

// ─── getImportGraph ─────────────────────────────────────────────────────────

describe('getImportGraph', () => {
  it('returns null when no metafile exists', () => {
    assert.strictEqual(getImportGraph('/nonexistent/path'), null)
  })

  it('returns null when metafile is malformed JSON', () => {
    writeFile(fixtureRoot, 'not valid json {{{')
    assert.strictEqual(getImportGraph(fixtureRoot), null)
  })

  it('returns a graph when metafile exists', () => {
    writeMetafile(fixtureRoot, {
      inputs: {
        'src/a.js': { imports: [{ path: 'src/b.js' }] },
        'src/b.js': { imports: [] },
      },
    })
    const graph = getImportGraph(fixtureRoot)
    assert.notStrictEqual(graph, null)
  })

  it('returns cached result for same project root', () => {
    writeMetafile(fixtureRoot, {
      inputs: {
        'src/a.js': { imports: [{ path: 'src/b.js' }] },
        'src/b.js': { imports: [] },
      },
    })
    const graph1 = getImportGraph(fixtureRoot)
    const graph2 = getImportGraph(fixtureRoot)
    assert.strictEqual(graph1, graph2) // same object reference
  })

  it('re-reads when project root changes', () => {
    const root2 = join(fixtureRoot, 'project2')
    writeMetafile(fixtureRoot, {
      inputs: {
        'src/a.js': { imports: [{ path: 'src/b.js' }] },
        'src/b.js': { imports: [] },
      },
    })
    writeMetafile(root2, {
      inputs: {
        'src/x.js': { imports: [] },
      },
    })

    const graph1 = getImportGraph(fixtureRoot)
    const graph2 = getImportGraph(root2)
    assert.notStrictEqual(graph1, graph2) // different objects
  })

  it('handles empty inputs', () => {
    writeMetafile(fixtureRoot, { inputs: {} })
    const graph = getImportGraph(fixtureRoot)
    assert.notStrictEqual(graph, null)
    assert.strictEqual(graph.transitiveDeps('anything').size, 0)
  })

  it('handles missing inputs key gracefully', () => {
    writeMetafile(fixtureRoot, { outputs: {} })
    const graph = getImportGraph(fixtureRoot)
    assert.notStrictEqual(graph, null)
    assert.strictEqual(graph.transitiveDeps('anything').size, 0)
  })
})

// ─── transitiveDeps ─────────────────────────────────────────────────────────

describe('transitiveDeps', () => {
  it('returns direct dependencies', () => {
    writeMetafile(fixtureRoot, {
      inputs: {
        'a.js': { imports: [{ path: 'b.js' }, { path: 'c.js' }] },
        'b.js': { imports: [] },
        'c.js': { imports: [] },
      },
    })
    const graph = getImportGraph(fixtureRoot)
    const deps = graph.transitiveDeps('a.js')

    assert.strictEqual(deps.size, 2)
    assert.ok(deps.has('b.js'))
    assert.ok(deps.has('c.js'))
  })

  it('returns transitive dependencies through multiple hops', () => {
    writeMetafile(fixtureRoot, {
      inputs: {
        'a.js': { imports: [{ path: 'b.js' }] },
        'b.js': { imports: [{ path: 'c.js' }] },
        'c.js': { imports: [{ path: 'd.js' }] },
        'd.js': { imports: [] },
      },
    })
    const graph = getImportGraph(fixtureRoot)
    const deps = graph.transitiveDeps('a.js')

    assert.strictEqual(deps.size, 3)
    assert.ok(deps.has('b.js'))
    assert.ok(deps.has('c.js'))
    assert.ok(deps.has('d.js'))
  })

  it('does not include the source file itself', () => {
    writeMetafile(fixtureRoot, {
      inputs: {
        'a.js': { imports: [{ path: 'b.js' }] },
        'b.js': { imports: [] },
      },
    })
    const graph = getImportGraph(fixtureRoot)
    const deps = graph.transitiveDeps('a.js')

    assert.ok(!deps.has('a.js'))
  })

  it('handles circular dependencies without infinite loop', () => {
    writeMetafile(fixtureRoot, {
      inputs: {
        'a.js': { imports: [{ path: 'b.js' }] },
        'b.js': { imports: [{ path: 'c.js' }] },
        'c.js': { imports: [{ path: 'a.js' }] }, // cycle back
      },
    })
    const graph = getImportGraph(fixtureRoot)
    const deps = graph.transitiveDeps('a.js')

    // Should include b, c but not a itself
    assert.strictEqual(deps.size, 2)
    assert.ok(deps.has('b.js'))
    assert.ok(deps.has('c.js'))
    assert.ok(!deps.has('a.js'))
  })

  it('handles self-referencing imports', () => {
    writeMetafile(fixtureRoot, {
      inputs: {
        'a.js': { imports: [{ path: 'a.js' }] }, // imports itself
      },
    })
    const graph = getImportGraph(fixtureRoot)
    const deps = graph.transitiveDeps('a.js')

    assert.strictEqual(deps.size, 0) // self not counted
  })

  it('handles diamond dependencies (A → B → D, A → C → D)', () => {
    writeMetafile(fixtureRoot, {
      inputs: {
        'a.js': { imports: [{ path: 'b.js' }, { path: 'c.js' }] },
        'b.js': { imports: [{ path: 'd.js' }] },
        'c.js': { imports: [{ path: 'd.js' }] },
        'd.js': { imports: [] },
      },
    })
    const graph = getImportGraph(fixtureRoot)
    const deps = graph.transitiveDeps('a.js')

    // d.js should appear only once
    assert.strictEqual(deps.size, 3)
    assert.ok(deps.has('b.js'))
    assert.ok(deps.has('c.js'))
    assert.ok(deps.has('d.js'))
  })

  it('skips external imports', () => {
    writeMetafile(fixtureRoot, {
      inputs: {
        'a.js': { imports: [
          { path: 'b.js' },
          { path: 'react', external: true },
        ] },
        'b.js': { imports: [] },
      },
    })
    const graph = getImportGraph(fixtureRoot)
    const deps = graph.transitiveDeps('a.js')

    assert.strictEqual(deps.size, 1)
    assert.ok(deps.has('b.js'))
    assert.ok(!deps.has('react'))
  })

  it('returns empty set for unknown files', () => {
    writeMetafile(fixtureRoot, {
      inputs: { 'a.js': { imports: [] } },
    })
    const graph = getImportGraph(fixtureRoot)
    const deps = graph.transitiveDeps('unknown.js')

    assert.strictEqual(deps.size, 0)
  })

  it('handles deep chains (5+ levels)', () => {
    writeMetafile(fixtureRoot, {
      inputs: {
        'a.js': { imports: [{ path: 'b.js' }] },
        'b.js': { imports: [{ path: 'c.js' }] },
        'c.js': { imports: [{ path: 'd.js' }] },
        'd.js': { imports: [{ path: 'e.js' }] },
        'e.js': { imports: [{ path: 'f.js' }] },
        'f.js': { imports: [] },
      },
    })
    const graph = getImportGraph(fixtureRoot)
    const deps = graph.transitiveDeps('a.js')

    assert.strictEqual(deps.size, 5)
    assert.ok(deps.has('f.js'))
  })

  it('handles multiple independent import trees', () => {
    writeMetafile(fixtureRoot, {
      inputs: {
        'a.js': { imports: [{ path: 'b.js' }] },
        'b.js': { imports: [] },
        'x.js': { imports: [{ path: 'y.js' }] },
        'y.js': { imports: [] },
      },
    })
    const graph = getImportGraph(fixtureRoot)

    const depsA = graph.transitiveDeps('a.js')
    assert.ok(depsA.has('b.js'))
    assert.ok(!depsA.has('x.js'))
    assert.ok(!depsA.has('y.js'))

    const depsX = graph.transitiveDeps('x.js')
    assert.ok(depsX.has('y.js'))
    assert.ok(!depsX.has('a.js'))
    assert.ok(!depsX.has('b.js'))
  })
})

// ─── findChain ──────────────────────────────────────────────────────────────

describe('findChain', () => {
  it('finds a direct chain (1 hop)', () => {
    writeMetafile(fixtureRoot, {
      inputs: {
        'a.js': { imports: [{ path: 'b.js' }] },
        'b.js': { imports: [] },
      },
    })
    const graph = getImportGraph(fixtureRoot)
    const chain = graph.findChain('a.js', 'b.js')

    assert.deepStrictEqual(chain, ['a.js', 'b.js'])
  })

  it('finds a transitive chain (2 hops)', () => {
    writeMetafile(fixtureRoot, {
      inputs: {
        'a.js': { imports: [{ path: 'b.js' }] },
        'b.js': { imports: [{ path: 'c.js' }] },
        'c.js': { imports: [] },
      },
    })
    const graph = getImportGraph(fixtureRoot)
    const chain = graph.findChain('a.js', 'c.js')

    assert.deepStrictEqual(chain, ['a.js', 'b.js', 'c.js'])
  })

  it('finds the shortest chain in a diamond', () => {
    writeMetafile(fixtureRoot, {
      inputs: {
        'a.js': { imports: [{ path: 'b.js' }, { path: 'd.js' }] }, // direct to d!
        'b.js': { imports: [{ path: 'c.js' }] },
        'c.js': { imports: [{ path: 'd.js' }] },
        'd.js': { imports: [] },
      },
    })
    const graph = getImportGraph(fixtureRoot)
    const chain = graph.findChain('a.js', 'd.js')

    // Should be [a, d] not [a, b, c, d]
    assert.deepStrictEqual(chain, ['a.js', 'd.js'])
  })

  it('returns null when no path exists', () => {
    writeMetafile(fixtureRoot, {
      inputs: {
        'a.js': { imports: [{ path: 'b.js' }] },
        'b.js': { imports: [] },
        'c.js': { imports: [] }, // not reachable from a
      },
    })
    const graph = getImportGraph(fixtureRoot)
    const chain = graph.findChain('a.js', 'c.js')

    assert.strictEqual(chain, null)
  })

  it('returns null for unknown source', () => {
    writeMetafile(fixtureRoot, {
      inputs: { 'a.js': { imports: [] } },
    })
    const graph = getImportGraph(fixtureRoot)
    const chain = graph.findChain('unknown.js', 'a.js')

    assert.strictEqual(chain, null)
  })

  it('handles circular dependencies in chain search', () => {
    writeMetafile(fixtureRoot, {
      inputs: {
        'a.js': { imports: [{ path: 'b.js' }] },
        'b.js': { imports: [{ path: 'c.js' }] },
        'c.js': { imports: [{ path: 'a.js' }, { path: 'd.js' }] },
        'd.js': { imports: [] },
      },
    })
    const graph = getImportGraph(fixtureRoot)
    const chain = graph.findChain('a.js', 'd.js')

    assert.deepStrictEqual(chain, ['a.js', 'b.js', 'c.js', 'd.js'])
  })

  it('finds chain through a deep path (5 hops)', () => {
    writeMetafile(fixtureRoot, {
      inputs: {
        'a.js': { imports: [{ path: 'b.js' }] },
        'b.js': { imports: [{ path: 'c.js' }] },
        'c.js': { imports: [{ path: 'd.js' }] },
        'd.js': { imports: [{ path: 'e.js' }] },
        'e.js': { imports: [{ path: 'f.js' }] },
        'f.js': { imports: [] },
      },
    })
    const graph = getImportGraph(fixtureRoot)
    const chain = graph.findChain('a.js', 'f.js')

    assert.deepStrictEqual(chain, ['a.js', 'b.js', 'c.js', 'd.js', 'e.js', 'f.js'])
  })
})

// ─── .universal.js–specific scenarios ────────────────────────────────────────

describe('universal nesting detection patterns', () => {
  it('detects A.universal → Wrapper → B.universal', () => {
    writeMetafile(fixtureRoot, {
      inputs: {
        'src/features/Outer.universal.js': {
          imports: [{ path: 'src/features/Wrapper.js' }],
        },
        'src/features/Wrapper.js': {
          imports: [{ path: 'src/features/Inner.universal.js' }],
        },
        'src/features/Inner.universal.js': { imports: [] },
      },
    })
    const graph = getImportGraph(fixtureRoot)
    const deps = graph.transitiveDeps('src/features/Outer.universal.js')
    const universalDeps = [...deps].filter(d => d.endsWith('.universal.js'))

    assert.strictEqual(universalDeps.length, 1)
    assert.strictEqual(universalDeps[0], 'src/features/Inner.universal.js')

    const chain = graph.findChain(
      'src/features/Outer.universal.js',
      'src/features/Inner.universal.js'
    )
    assert.deepStrictEqual(chain, [
      'src/features/Outer.universal.js',
      'src/features/Wrapper.js',
      'src/features/Inner.universal.js',
    ])
  })

  it('detects through multiple intermediate files', () => {
    writeMetafile(fixtureRoot, {
      inputs: {
        'src/A.universal.js': { imports: [{ path: 'src/B.js' }] },
        'src/B.js': { imports: [{ path: 'src/C.js' }] },
        'src/C.js': { imports: [{ path: 'src/D.universal.js' }] },
        'src/D.universal.js': { imports: [] },
      },
    })
    const graph = getImportGraph(fixtureRoot)
    const deps = graph.transitiveDeps('src/A.universal.js')
    const universalDeps = [...deps].filter(d => d.endsWith('.universal.js'))

    assert.strictEqual(universalDeps.length, 1)
    assert.strictEqual(universalDeps[0], 'src/D.universal.js')
  })

  it('detects multiple transitive universal deps from one file', () => {
    writeMetafile(fixtureRoot, {
      inputs: {
        'src/Page.universal.js': {
          imports: [{ path: 'src/Layout.js' }, { path: 'src/Sidebar.js' }],
        },
        'src/Layout.js': { imports: [{ path: 'src/Header.universal.js' }] },
        'src/Sidebar.js': { imports: [{ path: 'src/Widget.universal.js' }] },
        'src/Header.universal.js': { imports: [] },
        'src/Widget.universal.js': { imports: [] },
      },
    })
    const graph = getImportGraph(fixtureRoot)
    const deps = graph.transitiveDeps('src/Page.universal.js')
    const universalDeps = [...deps].filter(d => d.endsWith('.universal.js'))

    assert.strictEqual(universalDeps.length, 2)
    assert.ok(universalDeps.includes('src/Header.universal.js'))
    assert.ok(universalDeps.includes('src/Widget.universal.js'))
  })

  it('does not flag universal deps from non-universal files', () => {
    writeMetafile(fixtureRoot, {
      inputs: {
        'src/pages/Home.js': { // not .universal.js!
          imports: [{ path: 'src/features/Menu.universal.js' }],
        },
        'src/features/Menu.universal.js': { imports: [] },
      },
    })
    const graph = getImportGraph(fixtureRoot)
    // This is fine — Home.js is not a universal file
    const deps = graph.transitiveDeps('src/pages/Home.js')
    assert.ok(deps.has('src/features/Menu.universal.js'))
    // The rule itself skips non-.universal.js files, not the graph
  })

  it('handles realistic Kaliber project structure', () => {
    writeMetafile(fixtureRoot, {
      inputs: {
        'src/pages/Home.js': {
          imports: [
            { path: 'src/features/hero/Hero.universal.js' },
            { path: 'src/features/navigation/Navigation.universal.js' },
          ],
        },
        'src/features/hero/Hero.universal.js': {
          imports: [
            { path: 'src/features/buildingBlocks/Button.js' },
            { path: 'src/machinery/I18n.js' },
          ],
        },
        'src/features/navigation/Navigation.universal.js': {
          imports: [
            { path: 'src/features/buildingBlocks/Link.js' },
            { path: 'src/machinery/I18n.js' },
          ],
        },
        'src/features/buildingBlocks/Button.js': {
          imports: [{ path: 'src/machinery/I18n.js' }],
        },
        'src/features/buildingBlocks/Link.js': {
          imports: [{ path: 'src/machinery/I18n.js' }],
        },
        'src/machinery/I18n.js': { imports: [] },
      },
    })
    const graph = getImportGraph(fixtureRoot)

    // Hero.universal.js should not have any universal deps
    const heroDeps = graph.transitiveDeps('src/features/hero/Hero.universal.js')
    const heroUniversalDeps = [...heroDeps].filter(d => d.endsWith('.universal.js'))
    assert.strictEqual(heroUniversalDeps.length, 0)

    // Page is not universal, so it can import universals
    const pageDeps = graph.transitiveDeps('src/pages/Home.js')
    const pageUniversalDeps = [...pageDeps].filter(d => d.endsWith('.universal.js'))
    assert.strictEqual(pageUniversalDeps.length, 2)
  })

  it('detects sneaky nesting via shared buildingBlocks', () => {
    // The problematic pattern: a universal component uses a buildingBlock
    // that internally renders another universal component
    writeMetafile(fixtureRoot, {
      inputs: {
        'src/features/Search.universal.js': {
          imports: [{ path: 'src/features/buildingBlocks/SearchBar.js' }],
        },
        'src/features/buildingBlocks/SearchBar.js': {
          imports: [{ path: 'src/features/suggestions/Suggestions.universal.js' }],
        },
        'src/features/suggestions/Suggestions.universal.js': {
          imports: [{ path: 'src/machinery/hooks.js' }],
        },
        'src/machinery/hooks.js': { imports: [] },
      },
    })
    const graph = getImportGraph(fixtureRoot)
    const deps = graph.transitiveDeps('src/features/Search.universal.js')
    const universalDeps = [...deps].filter(d => d.endsWith('.universal.js'))

    assert.strictEqual(universalDeps.length, 1)
    assert.strictEqual(universalDeps[0], 'src/features/suggestions/Suggestions.universal.js')

    const chain = graph.findChain(
      'src/features/Search.universal.js',
      'src/features/suggestions/Suggestions.universal.js'
    )
    assert.deepStrictEqual(chain, [
      'src/features/Search.universal.js',
      'src/features/buildingBlocks/SearchBar.js',
      'src/features/suggestions/Suggestions.universal.js',
    ])
  })
})

// ─── helpers ─────────────────────────────────────────────────────────────────

function writeMetafile(root, metafile) {
  const dir = join(root, '.kaliber-build')
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'server-metafile.json'), JSON.stringify(metafile))
}

function writeFile(root, content) {
  const dir = join(root, '.kaliber-build')
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'server-metafile.json'), content)
}
