const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { Linter } = require('eslint')
const plugin = require('..')

// The committed replacement for the scratch harness docs/research/performance.md
// used to describe. Everything it measures is in this file, so a number in that
// document can be re-derived rather than trusted:
//
//   pnpm benchmark:security
//
// Run it on a machine that is otherwise idle. Medians, not means — one GC pause
// otherwise decides the answer.

const WARMUP = 10
const RUNS = 41
const CORPUS_RUNS = 9
const CORPUS_WARMUP = 2
const MEMORY_BATCHES = 8
const MEMORY_FILES_PER_BATCH = 40

const CONFIGS = {
  none: { rules: {} },
  security: plugin.configs.security,
  audit: plugin.configs['security-audit'],
}

const LANGUAGE_OPTIONS = { ecmaVersion: 2022, sourceType: 'module' }

main()

function main() {
  const linter = new Linter()

  console.log(environment())

  section('Single files')
  const table = []
  for (const [name, code] of Object.entries(fixtures())) {
    table.push(measureFile(linter, name, code))
  }
  printOverheadTable(table)

  section('Concatenation chains (the quadratic regression guard)')
  printChainTable([25, 50, 100, 200, 400].map(n => measureFile(linter, `chain(${n})`, concatChain(n), n)))

  section(`Repeated files — ${MEMORY_BATCHES} batches of ${MEMORY_FILES_PER_BATCH}`)
  printMemory(measureMemory(linter))

  section('Repository corpus, against a bare parse')
  const corpus = measureCorpus(linter)
  printOverheadTable([corpus])

  section('Repository corpus, as a share of a real lint run')
  printSharedConfigOverhead(corpus, measureSharedConfigCorpus(linter))

  console.log('\nBudgets: no-sink file < 1 ms absolute; corpus < 10% median for `security`.')
  console.log('The audit preset has no budget — it is recorded, not gated.')
}

// --- measurement -----------------------------------------------------------

function measureFile(linter, name, code, size = code.length) {
  const times = {}
  for (const [config, value] of Object.entries(CONFIGS)) {
    times[config] = median(() => linter.verify(code, withLanguageOptions(value), 'benchmark.js'))
  }
  return { name, size, ...times }
}

/**
 * Every .js file this repo ships, linted as one batch — the closest thing to a
 * whole-project run that needs no external corpus, and it is real code rather
 * than a generator's idea of it.
 */
function measureCorpus(linter) {
  const files = corpusFiles()

  const times = {}
  for (const [config, value] of Object.entries(CONFIGS)) {
    const resolved = withLanguageOptions(value)
    times[config] = median(() => lintAll(linter, files, resolved), CORPUS_RUNS, CORPUS_WARMUP)
  }

  return { name: `${files.length} repository files`, size: totalSize(files), ...times }
}

/**
 * The same corpus under the shared config, with no security rules — what a
 * consumer's lint run already costs.
 *
 * Measured as a baseline and combined with the isolated delta above rather than
 * A/B-ed directly: a 200 ms delta inside a 3.5 second run is under the
 * between-run variance of that run, and a direct comparison produces answers
 * like "-2.6% overhead". The security rules' cost is additive to whatever else
 * is enabled, so the division is the honest arithmetic and the noisy subtraction
 * is not.
 */
function measureSharedConfigCorpus(linter) {
  const files = corpusFiles()
  const shared = require('../eslint.config.js')

  return median(() => lintAll(linter, files, shared), CORPUS_RUNS, CORPUS_WARMUP)
}

function corpusFiles() {
  return repositoryFiles().map(file => ({ file, code: fs.readFileSync(file, 'utf8') }))
}

function lintAll(linter, files, config) {
  for (const { file, code } of files) linter.verify(code, config, file)
}

function totalSize(files) {
  return files.reduce((total, it) => total + it.code.length, 0)
}

/**
 * Analysis is cached in a WeakMap keyed on SourceCode, so a fresh parse should
 * make the previous analysis collectable. What this looks for is the failure of
 * that claim: heap that climbs batch over batch and does not come back after a
 * forced collection. Each file is textually distinct so nothing is deduplicated
 * upstream of us.
 */
function measureMemory(linter) {
  const config = withLanguageOptions(CONFIGS.audit)
  const batches = []

  collect()
  const start = heapUsed()

  for (let batch = 0; batch < MEMORY_BATCHES; batch++) {
    for (let file = 0; file < MEMORY_FILES_PER_BATCH; file++) {
      const id = batch * MEMORY_FILES_PER_BATCH + file
      linter.verify(sinkDense(6, id), config, `memory-${id}.js`)
    }
    collect()
    batches.push(heapUsed() - start)
  }

  return { batches, rss: process.memoryUsage().rss }
}

function median(run, runs = RUNS, warmup = WARMUP) {
  for (let i = 0; i < warmup; i++) run()

  const samples = []
  for (let i = 0; i < runs; i++) {
    const started = process.hrtime.bigint()
    run()
    samples.push(Number(process.hrtime.bigint() - started) / 1e6)
  }

  samples.sort((a, b) => a - b)
  return samples[Math.floor(samples.length / 2)]
}

// --- fixtures --------------------------------------------------------------

function fixtures() {
  return {
    'real source, no sinks': realSourceFile(),
    'sink-dense, tainted': sinkDense(50),
    'sink-dense, parameterized': parameterizedSinks(250),
  }
}

/**
 * A large hand-written file with no security sink in it — the shape most files
 * in any codebase have, and the one the sub-millisecond budget is about. ESLint's
 * own linter.js is a dependency of this package, so it is always present and
 * always the same bytes for a given lockfile.
 */
function realSourceFile() {
  const eslintRoot = path.dirname(require.resolve('eslint/package.json'))
  const found = ['lib/linter/linter.js', 'lib/rules/no-unused-vars.js']
    .map(relative => path.join(eslintRoot, relative))
    .find(candidate => fs.existsSync(candidate))

  if (!found) throw new Error('benchmark: no real source file found to measure')

  // Read as text and lint as a script: what is being measured is parse plus
  // analysis, not module resolution.
  return fs.readFileSync(found, 'utf8')
}

function sinkDense(handlers, salt = 0) {
  return Array.from({ length: handlers }, (unused, i) => `
    export function handler${salt}_${i}(req, res) {
      const id = req.query.id${i}
      db.query('select * from t where id = ' + id)
      fs.readFile(path.join(base, req.params.file${i}), cb)
      res.redirect(req.query.next${i})
      child.exec('ls ' + req.body.dir${i})
    }
  `).join('\n')
}

function parameterizedSinks(count) {
  return Array.from({ length: count }, (unused, i) => `
    export function safe${i}(req, res) {
      db.query('select * from t where id = $1', [req.query.id])
      res.json({ ok: ${i} })
    }
  `).join('\n')
}

/** `taint + 'a' + 'b' + …` — the shape whose cost used to grow with the square of n. */
function concatChain(length) {
  const tail = Array.from({ length }, (unused, i) => `'segment${i}'`).join(' + ')
  return `export function handler(req, res) { db.query(req.query.id + ${tail}) }`
}

function repositoryFiles() {
  const root = path.join(__dirname, '..')
  const files = []

  walk(root)
  return files.sort()

  function walk(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (entry.name.startsWith('.') || entry.name === 'node_modules') continue

      const full = path.join(directory, entry.name)
      if (entry.isDirectory()) walk(full)
      else if (entry.name.endsWith('.js')) files.push(full)
    }
  }
}

// --- output ----------------------------------------------------------------

function environment() {
  return [
    `node ${process.version}, eslint ${require('eslint/package.json').version}`,
    `${os.type()} ${os.release()} ${process.arch}, ${os.cpus()[0]?.model ?? 'unknown cpu'}`,
    `median of ${RUNS} runs after ${WARMUP} warmups (corpus: ${CORPUS_RUNS} runs after ${CORPUS_WARMUP})`,
    global.gc ? 'gc exposed' : 'gc NOT exposed — run through `pnpm benchmark:security` for the memory numbers',
  ].join('\n')
}

function printOverheadTable(rows) {
  const header = ['shape', 'size', 'none', 'security', 'Δ', 'rel', 'audit', 'Δ', 'rel']
  print([header, ...rows.map(row => [
    row.name,
    kb(row.size),
    ms(row.none),
    ms(row.security),
    ms(row.security - row.none),
    percent(row.security, row.none),
    ms(row.audit),
    ms(row.audit - row.none),
    percent(row.audit, row.none),
  ])])
}

/**
 * `Δ / n²` is the whole point of this table: a constant column means quadratic
 * growth, a column that falls away with n means it is gone.
 */
function printChainTable(rows) {
  const header = ['chain', 'none', 'security', 'Δ', 'Δ/n (µs)', 'Δ/n² (µs)']
  print([header, ...rows.map(row => {
    const delta = row.security - row.none
    return [
      String(row.size),
      ms(row.none),
      ms(row.security),
      ms(delta),
      (delta * 1000 / row.size).toFixed(1),
      (delta * 1000 / (row.size * row.size)).toFixed(2),
    ]
  })])
}

function printSharedConfigOverhead(corpus, sharedBaseline) {
  print([
    ['', 'ms', 'share of a real lint run'],
    ['shared config, no security rules', ms(sharedBaseline), '—'],
    ['+ security', ms(corpus.security - corpus.none), percentOf(corpus.security - corpus.none, sharedBaseline)],
    ['+ security-audit', ms(corpus.audit - corpus.none), percentOf(corpus.audit - corpus.none, sharedBaseline)],
  ])
}

function printMemory({ batches, rss }) {
  print([
    ['batch', 'heap after collection'],
    ...batches.map((heap, i) => [String(i + 1), `${(heap / 1024 / 1024).toFixed(2)} MB vs start`]),
  ])

  const growth = batches.at(-1) - batches[0]
  const monotonic = batches.every((heap, i) => i === 0 || heap >= batches[i - 1])

  console.log(`\nRSS ${(rss / 1024 / 1024).toFixed(0)} MB. Heap batch 1 -> ${batches.length}: ${(growth / 1024 / 1024).toFixed(2)} MB.`)
  console.log(monotonic
    ? 'Heap climbed on every batch — investigate before release.'
    : 'Heap did not climb monotonically: analyses are being collected.')
}

function print(rows) {
  const widths = rows[0].map((unused, column) => Math.max(...rows.map(row => String(row[column]).length)))
  for (const row of rows) {
    console.log(row.map((cell, column) => String(cell).padEnd(widths[column])).join('  ').trimEnd())
  }
}

function section(title) {
  console.log(`\n${title}\n${'-'.repeat(title.length)}`)
}

function withLanguageOptions(config) {
  return { ...config, languageOptions: LANGUAGE_OPTIONS }
}

function heapUsed() {
  return process.memoryUsage().heapUsed
}

function collect() {
  global.gc?.()
}

function kb(bytes) {
  return `${Math.round(bytes / 1024)}K`
}

function ms(value) {
  return `${value >= 0 ? '' : '-'}${Math.abs(value).toFixed(2)}`
}

function percent(with_, without) {
  return percentOf(with_ - without, without)
}

function percentOf(delta, total) {
  return `${((delta / total) * 100).toFixed(1)}%`
}
