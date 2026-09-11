const test = require('node:test')
const assert = require('node:assert')
const { describe } = require('node:test')
const { Linter } = require('eslint')
const { analyze } = require('./taint')
const { DEFAULTS } = require('./finding')

const linter = new Linter()

/**
 * Cross-file resolution needs a real file on disk to resolve *to* — a
 * relative or root-slash specifier is meaningless without one. The fixtures
 * under fixtures/interprocedural/ are real, permanent files for exactly
 * this; only the *caller* in each test below is inline, given a filename
 * that places it inside that fixture tree so its imports resolve.
 *
 * Companion to the same-file suite in taint.test.js — this file exists
 * because RuleTester (and Linter.verify with no real path) cannot exercise
 * multi-file resolution at all.
 */
const FIXTURES = `${__dirname}/fixtures/interprocedural/src`
const CALLER = `${FIXTURES}/caller.js`

function taintAtSinks(code, filename = CALLER) {
  const found = []

  linter.verify(code, {
    plugins: {
      probe: {
        rules: {
          collect: {
            create(context) {
              const analysis = analyze(context.sourceCode, DEFAULTS, context.filename)
              return {
                CallExpression(node) {
                  const sink = analysis.sinkAt(node)
                  if (sink?.requires !== 'sql') return
                  const taint = analysis.taintOf(node.arguments[sink.argument])
                  if (taint) found.push(taint)
                },
              }
            },
          },
        },
      },
    },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: { 'probe/collect': 'error' },
  }, filename)

  return found
}

describe('cross-file resolution — interprocedural-lite phase 1', () => {
  test('a relative import (arrow function export) propagates taint', () => {
    const found = taintAtSinks(`
      import { clean } from './stringHelpers'
      function handler(req){ db.query(\`SELECT * FROM \${clean(req.query.t)}\`) }
    `)
    assert.strictEqual(found.length, 1)
  })

  test('a CommonJS require destructure propagates taint', () => {
    const found = taintAtSinks(`
      const { normalize } = require('./cjsHelpers')
      function handler(req){ db.query(\`SELECT * FROM \${normalize(req.query.t)}\`) }
    `)
    assert.strictEqual(found.length, 1)
  })

  test('a renamed require destructure resolves by the original exported name', () => {
    const found = taintAtSinks(`
      const { normalize: n } = require('./cjsHelpers')
      function handler(req){ db.query(\`SELECT * FROM \${n(req.query.t)}\`) }
    `)
    assert.strictEqual(found.length, 1)
  })

  test('a root-slash import resolves against the nearest package.json’s src', () => {
    const found = taintAtSinks(`
      import { pick } from '/machinery/rootHelpers'
      function handler(req){ db.query(\`SELECT * FROM \${pick(req.query.t)}\`) }
    `)
    assert.strictEqual(found.length, 1)
  })

  test('a two-hop chain (file A calls an import from file B) composes', () => {
    const found = taintAtSinks(`
      import { cleanAndLower } from './wrapsImport'
      function handler(req){ db.query(\`SELECT * FROM \${cleanAndLower(req.query.t)}\`) }
    `)
    assert.strictEqual(found.length, 1)
  })

  test('mutual recursion across two files does not hang and resolves quietly', () => {
    const found = taintAtSinks(`
      import { helperA } from './cycleA'
      function handler(req){ db.query(\`SELECT * FROM \${helperA(req.query.t)}\`) }
    `)
    assert.strictEqual(found.length, 0)
  })

  test('an untainted argument through a cross-file helper stays quiet', () => {
    const found = taintAtSinks(`
      import { clean } from './stringHelpers'
      function handler(){ db.query(\`SELECT * FROM \${clean(config.table)}\`) }
    `)
    assert.strictEqual(found.length, 0)
  })

  test('a renamed export (export { x as y }) is a documented miss', () => {
    const found = taintAtSinks(`
      import { renamedIdentity } from './stringHelpers'
      function handler(req){ db.query(\`SELECT * FROM \${renamedIdentity(req.query.t)}\`) }
    `)
    assert.strictEqual(found.length, 0)
  })

  test('a bare package specifier never resolves — no chasing into node_modules', () => {
    const found = taintAtSinks(`
      import { escape } from 'sqlstring'
      function handler(req){ db.query(\`SELECT * FROM \${escape(req.query.t)}\`) }
    `)
    assert.strictEqual(found.length, 0)
  })

  test('an unresolvable specifier (file does not exist) stays a wall, not a crash', () => {
    const found = taintAtSinks(`
      import { ghost } from './does-not-exist'
      function handler(req){ db.query(\`SELECT * FROM \${ghost(req.query.t)}\`) }
    `)
    assert.strictEqual(found.length, 0)
  })

  test('calling the same cross-file helper twice with different taint resolves each independently', () => {
    const found = taintAtSinks(`
      import { clean } from './stringHelpers'
      function handler(req){
        db.query(\`SELECT * FROM \${clean(req.query.t)}\`)
        db.query(\`SELECT * FROM \${clean(config.table)}\`)
      }
    `)
    assert.strictEqual(found.length, 1)
  })
})
