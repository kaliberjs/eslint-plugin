# Performance — measured

Security analysis that makes ESLint noticeably slower gets switched off, so the
budgets in `architecture-research.md` §7.2 are treated as falsifiable claims rather
than aspirations.

## Reproducing this

```sh
pnpm benchmark:security
```

`benchmarks/security.js` is committed and is the only harness. Everything below is
its output — no scratch script, nothing to re-create. It measures, in one process
after warmup: single files at three shapes, concatenation chains at five lengths,
repeated batches for retained memory, and this repository's own 464 `.js` files as a
corpus, each against three configurations (no rules, `configs.security`,
`configs['security-audit']`). Medians, not means — one GC pause otherwise decides
the answer. Fixtures are generated in memory; nothing is written to the repository.

**Environment for the numbers below:** node v24.15.0, ESLint 10.8.1, Darwin 25.5.0
arm64, Apple M2 Pro. Median of 41 runs after 10 warmups; corpus median of 9 after 2.

## Single files

| Shape | Size | No rules | `security` | Δ | `security-audit` | Δ |
| --- | --- | --- | --- | --- | --- | --- |
| Real source, no sinks (`eslint/lib/linter/linter.js`) | 48 KB | 11.79 ms | 17.72 ms | **+5.93 ms** | 20.73 ms | +8.94 ms |
| Sink-dense, tainted (50 vulnerable handlers) | 13 KB | 5.54 ms | 9.07 ms | **+3.53 ms** | 9.82 ms | +4.28 ms |
| Sink-dense, parameterized (250 safe handlers) | 34 KB | 19.13 ms | 24.40 ms | **+5.27 ms** | 26.09 ms | +6.96 ms |

### The &lt; 1 ms no-sink budget: met per rule, not per preset

The budget was written when one rule shipped, and it holds per rule: enabling the
baseline one rule at a time costs roughly **0.3 ms per taint rule** on the 48 KB
no-sink file, and nothing measurable for the four matcher rules
(`no-node-tls-reject-unauthorized`, `no-disabled-tls-verification`,
`no-jwt-alg-none`, `no-unsafe-deserialization`, which are all below the noise floor).
Eighteen rules is eighteen times that, and 5.9 ms is not under 1 ms. Stated plainly:

> **This budget is not met by the preset as a whole, and the number should not be
> quoted as if it were.** It is met by every individual rule.

The cost is not the shared analysis, which is built once per file and reused: it is
that each rule runs its own AST traversal and its own sink lookup. A shared visitor
would collapse the eighteen traversals into one; that is an architecture change, not
a tuning pass, and it is not in this release.

Note also that the percentage column in the harness output compares against a **bare
parse with zero rules**, which no consumer ever runs. See the corpus section for the
figure that means something.

## Concatenation chains

| Chain length | Δ | Δ/n (µs) | Δ/n² (µs) |
| --- | --- | --- | --- |
| 25 | 0.10 ms | 3.8 | 0.15 |
| 50 | 0.10 ms | 2.0 | 0.04 |
| 100 | 0.17 ms | 1.7 | 0.02 |
| 200 | 0.24 ms | 1.2 | 0.01 |
| 400 | 0.47 ms | 1.2 | 0.00 |

`Δ/n` flattens and `Δ/n²` collapses to zero: growth is linear.

### The quadratic case, fixed

Earlier measurements of this table showed `Δ/n²` converging on ~223 µs — the
signature of quadratic growth — and 400 links costing 35.65 ms.

**Cause.** `resolve()` called `getStaticValue(node)` as its first, cheapest
false-positive filter. That call recurses the whole subtree beneath the node.
`taintOf` is memoised per node, so `getStaticValue` ran once per node in the chain —
but the *i*-th node's call walked *i* levels, so the total was O(n²).

**Fix.** The fold now runs *after* structural resolution, and only for
`ConditionalExpression` and `LogicalExpression`. The reasoning: structural
resolution already returns null for a foldable subtree in every other shape —
`resolveBinary` returns null when neither operand is tainted, `resolveTemplate`
when there are no expressions, `resolveIdentifier` when the binding is not a source.
A branch is the one shape where the two answers can differ, because a folded
condition decides which side is evaluated at all (`false && req.query.a` resolves as
tainted through its operand and folds to `false` as a whole). So the fold is asked
for there and nowhere else.

The full test suite passes unchanged, and `machinery/security/taint.performance.test.js`
fails if the reordering is undone — verified by undoing it (`chain(800)` went from
3.3x `chain(200)` to 10.8x, against a threshold of 8x). Nothing in the correctness
suite would have noticed.

### Also fixed: uncached module resolution

Not the documented problem, but the larger one, and found by profiling the `security`
preset over the no-sink file: **a third of the total run time was `statSync`.**

`resolveModulePath` tried up to five candidate paths per import specifier and cached
nothing — not even the null answer, which is the common one, because most specifiers
in a file are relative imports the analysis will never read. Every one of them was
re-statted for every rule, on every file. `resolveExistingFile` now memoises by base
path, with the same process-lifetime tradeoff already documented for
`crossFileSourceCache`.

Effect on the 48 KB no-sink file: `security` overhead **16.47 ms → 5.25 ms**, and
`security-audit` **27.14 ms → 7.12 ms**.

## Memory

Eight batches of 40 textually distinct sink-dense files under the audit preset, with
a forced collection between batches:

| Batch | Heap vs start |
| --- | --- |
| 1 | −1.53 MB |
| 4 | −1.54 MB |
| 8 | −1.50 MB |

Flat, and not monotonic — batch 8 sits 0.04 MB above batch 1, inside the noise of a
single collection. The `WeakMap` keyed on `SourceCode` is doing what it claims:
analyses are collected when the parse they belong to is. **No retained-`SourceCode`
growth was observed.**

RSS at the end of the run is ~365 MB, which is dominated by the corpus fixtures and
ESLint itself, not by the analysis.

## Repository corpus

464 `.js` files, 1073 KB, linted as one batch.

| | Time | Δ |
| --- | --- | --- |
| No rules (bare parse) | 274.37 ms | — |
| `configs.security` | 553.24 ms | +278.87 ms |
| `configs['security-audit']` | 607.40 ms | +333.04 ms |

That +101.6% headline is against a parse with *zero rules enabled*, which nobody
runs. Against the shared config a consumer already has:

| | Time | Share of a real lint run |
| --- | --- | --- |
| `eslint.config.js`, no security rules | 3141.83 ms | — |
| `configs.security` adds | 278.87 ms | **8.9%** |
| `configs['security-audit']` adds | 333.04 ms | 10.6% |

**The &lt; 10% whole-project budget for `configs.security` is met.** Two consecutive
runs measured 7.0% and 8.9%; the corpus baseline itself varies by ~15% between
processes, so treat this as "high single digits", not as 8.9%.

The audit preset is at 10.6% and has no budget — it is a preset someone runs
deliberately, not one that sits in CI.

### Why this is derived rather than A/B-ed

Measuring `shared config + security` directly against `shared config` buries a
~280 ms signal inside a ~3.1 s run whose own between-process variance is larger than
the signal; done that way it produced answers including **−2.6% overhead**, which is
not a result. The security rules' cost is additive to whatever else is enabled, so
the isolated delta divided by the real baseline is the honest arithmetic. The harness
does exactly that and says so.

## What has still not been measured

1. **A consumer project, rather than this repository.** 464 files of ESLint-rule
   source is a real corpus but a narrow one — it has almost no JSX, no React
   components, and few of the framework sinks the registry models. The dogfood run
   in the production-readiness report covers finding quality on real projects; it is
   not a timing measurement.
2. **`--fix` passes.** ESLint re-parses up to ten times; each pass gets a fresh
   `SourceCode` and therefore a fresh analysis. Expected to be linear in passes,
   unmeasured. No security rule is fixable, so this only matters when other rules are.
3. **Cross-file resolution at depth.** The corpus resolves imports within one
   package. A monorepo with long root-slash import chains would exercise
   `readCrossFileSourceCode` far harder, and that cache is process-lifetime and
   unbounded (`ponytail:` marker in `module-graph.js`).
4. **A watch-mode or editor process.** Both module-graph caches are keyed by
   absolute path with no invalidation, which is correct for a one-shot `pnpm lint`
   and wrong for a long-lived daemon. Documented in `module-graph.js`, unmeasured
   because nothing in this repository runs that way.
