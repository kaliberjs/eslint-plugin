const { messages } = require('./')
const { test } = require('../../machinery/test')
const { getImportGraph, _resetCache } = require('../../machinery/importGraph')
const { writeFileSync, mkdirSync, rmSync } = require('node:fs')
const { join } = require('node:path')
const { describe, it, afterEach } = require('node:test')

test('no-universal-in-universal', {
  valid: [
    // Non-universal file importing and rendering a universal component
    {
      filename: '/project/src/pages/Home.js',
      code: `import Menu from '/features/Menu.universal'\nfunction Home() { return <Menu /> }`,
    },
    // Universal file importing non-universal components
    {
      filename: '/project/src/features/Menu.universal.js',
      code: `import { Button } from '/features/buildingBlocks/Button'\nexport default function Menu() { return <Button /> }`,
    },
    // Universal file importing a universal but not rendering it (re-export)
    {
      filename: '/project/src/features/Wrapper.universal.js',
      code: `import Inner from '/features/Inner.universal'\nexport default Inner`,
    },
  ],
  invalid: [
    // Universal file importing AND rendering another universal component
    {
      filename: '/project/src/features/Outer.universal.js',
      code: `import Inner from '/features/Inner.universal'\nexport default function Outer() { return <div><Inner /></div> }`,
      errors: [{ message: messages['universal in universal']('Inner') }],
    },
    // Universal file with named import from universal
    {
      filename: '/project/src/features/Outer.universal.js',
      code: `import { Inner } from '/features/Inner.universal'\nexport default function Outer() { return <Inner /> }`,
      errors: [{ message: messages['universal in universal']('Inner') }],
    },
  ],
})

// ─── Transitive detection tests ─────────────────────────────────────────────

describe('no-universal-in-universal (transitive)', () => {
  const projectRoot = join(__dirname, '..', '..', '.test-fixtures', 'transitive-universal')

  afterEach(() => {
    _resetCache()
    try { rmSync(projectRoot, { recursive: true, force: true }) } catch {}
  })

  it('detects transitive universal nesting through a regular file', () => {
    writeMetafile(projectRoot, {
      inputs: {
        'src/features/Outer.universal.js': {
          imports: [{ path: 'src/features/Wrapper.js' }],
        },
        'src/features/Wrapper.js': {
          imports: [{ path: 'src/features/Inner.universal.js' }],
        },
        'src/features/Inner.universal.js': {
          imports: [],
        },
      },
    })

    const { getImportGraph } = require('../../machinery/importGraph')
    const graph = getImportGraph(projectRoot)

    const deps = graph.transitiveDeps('src/features/Outer.universal.js')
    const universalDeps = [...deps].filter(d => d.endsWith('.universal.js'))

    require('node:assert').strictEqual(universalDeps.length, 1)
    require('node:assert').strictEqual(universalDeps[0], 'src/features/Inner.universal.js')

    const chain = graph.findChain('src/features/Outer.universal.js', 'src/features/Inner.universal.js')
    require('node:assert').deepStrictEqual(chain, [
      'src/features/Outer.universal.js',
      'src/features/Wrapper.js',
      'src/features/Inner.universal.js',
    ])
  })

  it('does not flag non-universal transitive dependencies', () => {
    writeMetafile(projectRoot, {
      inputs: {
        'src/features/Outer.universal.js': {
          imports: [{ path: 'src/features/Wrapper.js' }],
        },
        'src/features/Wrapper.js': {
          imports: [{ path: 'src/machinery/hooks.js' }],
        },
        'src/machinery/hooks.js': {
          imports: [],
        },
      },
    })

    const { getImportGraph } = require('../../machinery/importGraph')
    const graph = getImportGraph(projectRoot)

    const deps = graph.transitiveDeps('src/features/Outer.universal.js')
    const universalDeps = [...deps].filter(d => d.endsWith('.universal.js'))

    require('node:assert').strictEqual(universalDeps.length, 0)
  })

  it('returns null when no metafile exists', () => {
    const { getImportGraph } = require('../../machinery/importGraph')
    const graph = getImportGraph('/nonexistent/path')

    require('node:assert').strictEqual(graph, null)
  })
})

function writeMetafile(projectRoot, metafile) {
  const dir = join(projectRoot, '.kaliber-build')
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'server-metafile.json'), JSON.stringify(metafile))
}
