# Performance — measured

Security analysis that makes ESLint noticeably slower gets switched off, so the
budgets in `architecture-research.md` §7.2 are treated as falsifiable claims rather
than aspirations. This records the first measurement of the actual implementation.

**Environment:** Node v24.15.0, ESLint 10.8.1, macOS (darwin 25.5.0), Apple silicon.
**Method:** `Linter#verify` in-process, 15 warmup runs discarded, **median of 60**
runs (median rather than mean — a single GC pause otherwise dominates). Baseline is
the same file linted with zero rules, so the delta isolates the rule and its
analysis from parse and scope-building cost.

Reproduce by re-creating the harness described under "Harness" below; the scratch
scripts are deliberately not committed.

## Results

| Shape | Size | Baseline | With rule | Delta | Relative |
| --- | --- | --- | --- | --- | --- |
| Large real file, zero SQL sinks (`eslint/lib/linter/linter.js`) | 48 KB | 11.89 ms | 11.86 ms | **−0.02 ms** | −0.2% |
| Same, repeat measurement | 48 KB | 11.52 ms | 11.86 ms | **+0.34 ms** | +3.0% |
| 50 vulnerable + 50 parameterized handlers | 8 KB | 4.15 ms | 4.92 ms | **+0.77 ms** | +18.6% |
| 500 parameterized sinks, no taint | 25 KB | 3.88 ms | 4.47 ms | **+0.58 ms** | +15.0% |

### Reading these numbers honestly

**The absolute delta is the meaningful figure, not the percentage.** The two
sink-dense rows are synthetic files that are trivially cheap to parse, so a
sub-millisecond addition looks like 15–19%. On the realistic 48 KB file the same
absolute cost disappears into measurement noise. Quoting "up to 19% slower" from
this table would be dishonest.

Two budgets from the architecture doc, checked:

- **&lt; 1 ms for a file with no sinks** — met. The two repeat measurements of the
  large real file bracket zero (−0.02 ms and +0.34 ms), i.e. below the noise floor
  of this harness. This is the case that matters, because most files in any codebase
  contain no SQL sink at all, and it is what backward-from-sink resolution buys:
  a file with no sinks does no dataflow work whatsoever.
- **&lt; 10% whole-project** — not yet measured. Needs the three-tier corpus
  (small / medium / large TypeScript project) rather than single files.

## The quadratic case

A long chain of string concatenations costs O(n²):

| Chain length | Delta | delta / n² (µs) |
| --- | --- | --- |
| 25 | 0.52 ms | 827 |
| 50 | 0.89 ms | 357 |
| 100 | 2.70 ms | 270 |
| 200 | 9.28 ms | 232 |
| 400 | 35.65 ms | 223 |

`delta / n²` converging on ~223 µs confirms the growth is quadratic, not linear.

**Cause.** `resolve()` calls `getStaticValue(node)` as its first, cheapest
false-positive filter. That call recurses the whole subtree beneath the node. Because
`taintOf` is memoised per node, `getStaticValue` runs once per node in the chain — but
the *i*-th node's call walks *i* levels, so the total is O(n²). `maxHops` does not
help: it bounds the taint path, not the constant-folding walk.

**Is it worth fixing.** Not at these magnitudes on its own — a 400-link
concatenation chain does not occur in real code, and at 25 links the cost is 0.5 ms.
But the fix may be free rather than merely cheap, because the early exit may be
redundant: `resolveBinary` already returns `null` when neither operand is tainted, so
the constant case that `getStaticValue` is there to catch (`'ls ' + 'x'`) is arguably
already caught by structural recursion returning nothing. If that holds, deleting the
call removes the quadratic term *and* a line of code.

That experiment is deliberately not run here: it changes `taint.js` while three
review agents are reading it. Tracked as follow-up, to be validated against the full
corpus in one change — the risk is that `getStaticValue` is load-bearing for a case
the current tests do not cover, which is exactly what the corpus is for.

## What has not been measured

1. **Whole-project runtime** on small / medium / large TypeScript projects. The
   single-file numbers above predict it will be dominated by parse cost, but that is a
   prediction, not a measurement.
2. **Cache effectiveness with many rules enabled.** The mechanism is tested
   (`taint.test.js` asserts one analysis object is shared and that `cacheHits`
   increments), but the *savings* claim — that fifty rules cost one construction —
   cannot be measured with one rule shipped. This is the single most important number
   still missing, because it is the whole justification for the shared-analysis
   architecture.
3. **Memory.** The `WeakMap` keyed on `SourceCode` should make analysis lifetime
   track AST lifetime, so RSS growth over a large run should be flat. Unverified.
4. **`--fix` passes.** ESLint re-parses up to ten times; each pass gets a fresh
   `SourceCode` and therefore a fresh analysis. Expected to be linear in passes,
   unmeasured.

## Harness

```js
const { Linter } = require('eslint')
const plugin = require('.')
const linter = new Linter()

function median(code, rules, runs = 60) {
  const config = { plugins: { '@kaliber': plugin }, languageOptions: { ecmaVersion: 2022, sourceType: 'module' }, rules }
  for (let i = 0; i < 15; i++) linter.verify(code, config)   // warm the JIT

  const samples = []
  for (let i = 0; i < runs; i++) {
    const start = process.hrtime.bigint()
    linter.verify(code, config)
    samples.push(Number(process.hrtime.bigint() - start) / 1e6)
  }

  return samples.sort((a, b) => a - b)[Math.floor(runs / 2)]
}
```

Delta is `median(code, { '@kaliber/security-no-sql-injection': 'error' }) - median(code, {})`.
