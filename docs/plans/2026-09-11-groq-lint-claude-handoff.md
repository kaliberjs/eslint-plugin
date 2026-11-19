# GROQ linting for Kaliber — research and Claude implementation handoff

Date: 2026-09-11. Status: proposed implementation plan; no lint rules or parser have been implemented by this research task.

## 1. Assignment for Claude

Build GROQ linting inside `/Volumes/Development/eslint-plugin`, following its existing CommonJS rule modules, test helper and public rule naming. Start with the four rules in section 5. Share extraction, parsing and traversal, but keep each rule's detection logic in its own module.

The user is interested in a handwritten, lint-oriented GROQ parser. Prototype it against the real corpus and the compatibility/performance gates below. Do not assume a custom parser is faster or ship reduced coverage under a performance claim. If the prototype fails the gate, retain a pinned `groq-js` parser behind the same interface and continue with the integration and rules that can be supported correctly; document the failed gate and remaining limitations.

Reference projects:

- `/Volumes/Development/landal-jobs`
- `/Volumes/Development/rabobank-jobs`

Use their current source as read-only research/validation inputs. The deliverable is the plugin implementation, fixtures, documentation and benchmarks. Changes to their application queries, schemas or dependencies are separate work. Do not execute application modules to extract queries, connect to Sanity, deploy, publish or create commits as part of this handoff unless separately requested.

Read the actual repository instructions when starting. Landal has `AGENTS.md`; Rabobank has lowercase `agents.md`. Existing untracked `docs/research/` notes in this plugin concern other work and are not the specification for this task.

## 2. Research snapshot and reproducibility

| Repository | Inspected HEAD |
| --- | --- |
| eslint-plugin | `3d0380cd4e43d3c077dc384a49084448b6681bbc` |
| landal-jobs | `edd049554cf35f38c576af0dee4c08b9103b5cfa` |
| rabobank-jobs | `83dea5fb8e90cfe41993ab92b957c1d726c1e185` |
| sanity-labs/sanity-lint | `8a4247dc9b98d7c3fa4f97c8dadcf4c49e863b68` |
| sanity-io/groq-js main, parser architecture review | `06ccb20914d3b92934bf95fd966ba53d87271d95` |

The plugin currently declares ESLint 10 and is version 2.3.0. Both applications have `groq` 4.22.0 and installed `groq-js` 1.30.3. Do not conflate the applications' parser with the inspected upstream main, whose package says 2.0.0. Record resolved versions in subsequent comparisons.

The source census used `rg --files` under `src`, `services`, `scripts`, `shared-client`, `config`, and Rabobank's `shared-server`; extensions `.js`, `.jsx`, `.mjs`, `.cjs`. It parsed all returned files with Espree, latest ECMAScript and JSX enabled. Dependencies, build output, backups, hidden harness files and docs were excluded. No JavaScript parse failures occurred.

| Census | Landal | Rabobank |
| --- | ---: | ---: |
| Source files parsed | 312 | 790 |
| `groq` tagged templates | 51 | 93 |
| Files containing those templates | 11 | 13 |
| Templates without JS interpolation | 11 | 38 |
| Templates with JS interpolation | 40 | 55 |
| JS interpolation expressions | 83 | 187 |
| Templates fully expanded by restricted research interpreter | 45 | 88 |
| Expanded templates accepted by installed parser | 45 | 88 |

These are template definitions/occurrences, not unique runtime queries or endpoint counts. The census recognized the identifier `groq`; manual inspection verified the relevant ESM imports and CommonJS requires. The implementation must use bindings rather than that census shortcut.

The research expansion was a limited AST interpreter, not application execution. It followed local constant declarations/imports, object member access, simple returned templates, selected pure built-ins, and the inspected image helper source. It did not resolve arbitrary runtime function arguments. Field-list fragments were checked inside `*[]{ ... }`; other resolved templates were checked as expressions. Acceptance by this parser establishes this baseline only, not full semantic validity against Content Lake or schemas.

Build a committed corpus collector as the first implementation task. It must reproduce the census, resolve the supported forms, retain source ownership and emit explicit unresolved reasons. Do not depend on `/private/tmp/` research scripts or on this machine's dependency paths. The measurements here are sufficient to seed that collector, but refresh them if source hashes change.

### Template manifest

All paths in the next two tables are relative to their application root.

| Landal file | Tags |
| --- | ---: |
| `src/groq/groqSnippetObjects.js` | 20 |
| `src/groq/groqSnippets.js` | 12 |
| `src/groq/groqSnippetFunctions.js` | 7 |
| `src/groq/utilities.js` | 2 |
| `src/admin/schemas/fields/slug.js` | 3 |
| `src/admin/deskStructure.js` | 2 |
| `src/admin/deskStructure/heroImageList.js` | 1 |
| `src/admin/schemas/machinery/getProfileQuery.js` | 1 |
| `src/admin/schemas/fields/documentCountry.js` | 1 |
| `services/elasticsearch-service.js` | 1 |
| `scripts/convert-job-overview-links.js` | 1 |

| Rabobank file | Tags |
| --- | ---: |
| `src/groqSnippets.js` | 39 |
| `src/routeMap.js` | 25 |
| `src/admin/deskStructure.js` | 11 |
| `src/admin/schemas/fields/slug.js` | 4 |
| `src/breadCrumbs.js` | 3 |
| `src/requestHandlers.js` | 2 |
| `src/domain/relatedJobsData.js` | 2 |
| `src/skills-match/requests.js` | 2 |
| `services/elasticsearch-service.js` | 1 |
| `src/admin/sanity.config.js` | 1 |
| `src/admin/scripts/find-videos.node.js` | 1 |
| `src/domain/sitemap.js` | 1 |
| `src/admin/schemas/fields/factHeadline.js` | 1 |

### Known unresolved definitions

These use function parameters as syntax fragments. They are not invalid queries. Resolving supported call sites may supply those parameters.

- Landal `src/groq/groqSnippetFunctions.js:20,29`: `projection`; `:68`: `field`.
- Landal `src/groq/utilities.js:6`: `projection`.
- Landal `src/admin/deskStructure.js:107`: `filter`.
- Landal `src/admin/schemas/fields/slug.js:49`: `findDuplicateFilter`.
- Rabobank `src/groqSnippets.js:510,519,525,534`: `projection`.
- Rabobank `src/admin/schemas/fields/slug.js:31`: `findDuplicateFilter`.

### Untagged GROQ is present too

Do not claim that supporting tags covers every query:

- Landal `scripts/add-country-to-documents.js:27`: literal passed to a Sanity client fetch.
- Landal `scripts/sync/locations-sanity.js:46`: untagged query template.
- Landal `src/admin/schemas/machinery/filter.js:5,17`: filter strings.
- Landal `src/admin/deskStructure.js:127`: untagged Studio filter template.
- Rabobank `scripts/migrate-job-detail-tiles.js:36` and `scripts/migrate-hero-tiles.js:48`: untagged migration queries; the latter interpolates serialized slot types.
- Rabobank `src/admin/schemas/machinery/filterByDocumentLanguage.js:2,6,10`: filter strings, including explicit language-independent techblog exceptions.

The simple untagged census heuristic found nine candidates; manual inspection added Landal's desk filter. This is a candidate inventory, not a claim of exhaustive untagged detection. Initially support only configured/proven Sanity sinks or explicit annotations; never interpret every `.fetch()`, `.filter()` or property named `filter` as GROQ. Keep untagged coverage separately reported from the 144-tag baseline.

## 3. How these projects write GROQ

### Shared conventions

- ESM `import groq from 'groq'` in application code; CommonJS `require('groq')` in service/script code.
- `$language`, `$type`, `$slug`, etc. carry runtime values. JavaScript `${...}` mostly composes query syntax.
- Query helpers return `[query, params]` for Kaliber routing. GROQ templates also occur directly in `client.fetch` and Studio filters.
- Templates may be complete queries, standalone predicates, object projections, comma-separated field lists or comma-separated conditional projection branches.
- Formatting varies: one-line and multiline templates, single/double quoted GROQ strings, optional spacing around `->`, `[]`, `==`, trailing commas and inline `//` comments. Preserve it; no GROQ formatting rule is justified by this study.
- Common grammar: filters, projection splats, conditional projections, dereferences, array traversal, `[0]`, slices, `coalesce`, `count`, `defined`, `path`, `order`, `@`, `^`, and parameters.

### Landal specifics

Definitions are split across four modules in `src/groq/`, then assembled in `src/routeData.js`. Imports such as `/groq/groqSnippetObjects` mean paths under the project's `src`, not filesystem-root paths.

Examples:

```js
const linkableDocumentFields = groq`_type, slug, language, _id`
export const linkableDocumentObject = groq`{${linkableDocumentFields}}`
// A query and a parameter bag:
return [groq`${singleDocumentFilter} ${projection}`, { type, language, country, slug }]
```

`menuItem()` returns a field-list fragment; `translations(projection)` returns a correlated subquery. `groqSnippetObjects.js` and `utilities.js` import each other, so distinguish a module import cycle from an actual cyclic value expansion. Lazy binding resolution can handle the former.

`klbrImageQuery('image')` and `klbrImageQuery()` come from `@kaliber/sanity-kaliber-image/sanity`. The inspected package implementation is `src/sanity/groqSnippets.js`; it constructs a correlated lookup and interpolates `klbrImageObject`. The latter contains `alt[$language]` and `source->._id`. The parser must accept these observed forms. Treat this as an explicit, version-tested helper contract, not permission to execute dependencies or assume all package functions are pure.

`services/elasticsearch-service.js:142,165,179` composes a field list with a constant array and a local `keys.join(', ')` helper. Runtime values remain GROQ parameters.

### Rabobank specifics

`src/groqSnippets.js` contains most reusable fragments; the `snippets` object exports both values and query-building methods. `src/routeMap.js` embeds projections and complete queries, often with `snippets.*` member expressions. `snippets.translations(snippets.linkableDocumentObjectWithTitle)` appears 20 times.

The tile/content graph expands recursively by reuse: `contentObject` includes tile branches that themselves include further projections. These are finite expansions but can be much larger than their source templates.

Additional observed forms:

```js
// Statically serialized syntax:
_type in ${JSON.stringify(Object.values(JOB_TILE_SLOT_TYPES))} => { _type }
// Interpolation occurs INSIDE a GROQ string:
heroTiles[_type != '${HERO_TILE_SLOT_TYPES.empty}'][] ${snippets.heroTilesObject}
// GROQ array concatenation and comment handling are needed too.
```

The slot constants live in `src/domain/getRelatedContentTiles.js` and `src/domain/heroTiles.js`. Do not evaluate their modules: they also export unrelated runtime functions.

Rabobank uses `@['_type']`, `@{...}`, `@->`, nested `^` references, inclusive `[0..1]`, and an intentional `order(select(...), _updatedAt desc)` language preference. These must survive parsing without false reports.

## 4. Evidence and upstream comparison

### Actionable source observations

**Landal repeated conditional projection:** `src/groq/groqSnippetObjects.js:123,125` repeats the same `_type == 'klbrImage' => ${klbrImageQuery()}` branch in `contentObject`. The intervening `sanityVideo` branch has a distinct literal `_type` condition. This is a strong fixture for duplicate-branch detection once the known helper is resolved. Do not flag all repeated conditions: separate same-condition branches can intentionally contribute different properties.

**Rabobank repeated dereferencing:** `src/routeMap.js:479–481` uses `referenceWithLabel.ref->` four times across the `label`, `ref`, and `subtitle` fields of the same submenu-item projection. Two occurrences are fallback operands in `coalesce`, so four syntactic occurrences does not mean four unconditional runtime executions. `src/routeMap.js:1095–1096` also resolves `vakgebied` separately for its slug and projected fields. These are two source groups to review and should be positive fixtures.

**Expanded query size:** fully resolved template at Rabobank `src/routeMap.js:635` is 63,419 UTF-8 bytes (~61.9 KiB). Other large resolved templates include `:1030` (34,414 bytes), `:723` (31,401), `:1078` (30,642), and `:835` (30,569). Some of these are projection arguments, not standalone requests. These numbers measure expansion of the template itself; assembled query wrappers can add more text. Landal's largest resolved template was `src/groq/groqSnippets.js:16`, 4,274 bytes.

**Computed ordering:** Rabobank `src/requestHandlers.js:800` explicitly ranks the requested language before a fallback via `order(select(language == $language => 0, 1) asc, _updatedAt desc)`. Treat this as an intentional tradeoff for manual review, not a default error or autofix.

**Filter comparison:** the same file at `:797` compares `lower(email)` with `lower($recruiterEmail)`. The RHS depends only on a query parameter. A rule that calls both sides document-dependent solely because both are function calls is too coarse. Sanity documents optimized lowercased-attribute comparisons, but the exact execution plan of this particular query was not inspected. Do not classify this as a confirmed slow query.

**Domain-specific review, not a generic rule:** Rabobank `src/groqSnippets.js:526` compares `$parentSlug` with the slug of an inner `vakgebied` query, without an obvious relation to the outer `subvakgebied` document. Landal's translation helper also compares `language == ^.language`. Whether either is a business-logic bug needs domain validation. Do not infer a universal rule or change them during plugin work.

### Controlled upstream rule experiment

Ran upstream schema-independent TypeScript rule objects against the 45/88 expanded templates using `groq-js` 1.30.3, and separately ran the checked-in WASM binary on the same corpus. Bare field lists were wrapped for parsing. This was NOT an end-to-end run of the upstream ESLint plugin, and findings may repeat across reused fragment definitions and consumers.

| Rule | TS Landal findings | TS Rabobank findings | WASM Landal findings | WASM Rabobank findings |
| --- | ---: | ---: | ---: | ---: |
| repeated-dereference | 184 | 893 | 0 | 0 |
| many-joins | 12 | 28 | 0 | 8 |
| join-to-get-id | 101 | 0 | 11 | 0 |
| very-large-query | 0 | 21 | 0 | 21 |
| non-literal-comparison | 0 | 1 | 0 | 1 |
| order-on-expr | 0 | 1 | 0 | 1 |

No other tested schema-independent rules fired on the resolved corpus. The unresolved definitions remain an explicit coverage gap; absence of findings there cannot be claimed.

The TS repeated-dereference rule groups by root attribute name and recursively visits descendant projections. For example, Landal's separate `menuItems` and `submenu` reference scopes get conflated. Its high count is not a defect count. Conversely, WASM's zero count does not establish absence of the manually observed Rabobank repetitions. Treat both engines as comparison inputs, not correctness oracles for rules.

Most Landal join-to-get-id findings come from the external image helper's `source->._id`, multiplied by reuse. That is a dependency-level review candidate. Replacing dereferenced `_id` with `_ref` can change behavior for unresolved references, so do not generate an automatic rewrite.

Raw join totals in content projections count alternative `_type` branches that cannot all execute for one item. Many-joins can be an inventory metric; a fixed total is a poor default warning for these projects.

Sanity's own performance guidance supports reviewing repeated references and large query text. It also documents optimizable parent references and lowercased attributes. It does not establish a universal 10 KiB failure threshold or prove these applications' latency. [High-performance GROQ](https://www.sanity.io/docs/developer-guides/high-performance-groq).

## 5. Initial rules and configuration

Expose four hyphenated keys, e.g. `@kaliber/groq-repeated-dereference`. Never put an extra slash inside a rule key; `rules/rule-names.test.js` guards this. Provide a separate opt-in GROQ preset so applications can review the results before adopting it. Do not silently enable the new rules in the plugin's broad existing config.

| Rule key | Proposed preset severity | Why it belongs |
| --- | --- | --- |
| `groq-valid-syntax` | error, for fully known supported inputs only | Foundation for useful parser diagnostics across the observed grammar; preventive, with zero known baseline syntax failures |
| `groq-no-duplicate-conditional-projection` | warn | Concrete Landal duplicate; needs exact structure and provenance |
| `groq-repeated-dereference` | warn | Two concrete Rabobank source groups; scope-aware analysis avoids upstream TS noise |
| `groq-max-query-size` | warn | Real expansion growth to 63,419 bytes; configurable budget rather than two overlapping size rules |

### `groq-valid-syntax`

- Distinguish query/expression, predicate, object projection, and field-list/conditional-list fragment entry modes. A fragment not being a standalone query is not an error.
- Only issue a syntax error when the appropriate supported mode is known and the relevant input is complete. In an unknown fragment context, avoid an error if a supported fragment mode accepts it; report grammar ambiguity/coverage separately.
- Unknown interpolation, unsupported syntax, expansion budget exhaustion, and actual invalid syntax are different outcomes. Unsupported/unresolved results must not masquerade as either confirmed valid syntax or confirmed syntax errors.
- No function-availability/schema/type validation in this rule. Parse generic function calls; do not ship a stale hardcoded Sanity function catalog.
- Assert zero false syntax errors on the 133 resolved templates. Add malformed fixtures rather than inventing existing application errors.

### `groq-no-duplicate-conditional-projection`

- Detect structurally identical condition AND body in the same object projection, initially for `_type == <literal>` conditions and fully known bodies.
- Ignore whitespace, quote style and source positions for structural equality. Preserve actual string values, operators, properties and interpolation provenance.
- For a nonadjacent duplicate, require that intervening branches are provably disjoint literal `_type` branches (as in Landal), or otherwise cannot overwrite its output. Do not treat arbitrary `A, B, A` projection sequences as safely redundant.
- Same guard with different bodies is allowed. Same body in different projection scopes is allowed. Unresolved calls are not assumed pure/equal merely because their source text matches.
- Report the later local branch once and identify the earlier branch. No automatic fix in v1; preserve result-shape and evaluation semantics.
- Verify Landal's duplicate after resolving the version-tested image-helper contract. Treat imported-body ownership as described in section 7.

### `groq-repeated-dereference`

- Group by exact reference path AND effective input document scope, not the first identifier. `a.ref`, `a.other`, and `b.ref` are different references.
- Keep nested arrays, dereferenced documents, nested queries, and parent scopes distinct. Merely entering a syntactic object is not always a new document scope; `@{...}` and object-valued expressions need explicit handling.
- Track direct output-field ownership and conditional branch identity. Initially require repeated use across at least two output fields in a compatible execution branch. Avoid warnings based solely on repeated fallback operands in one `coalesce` call.
- Disjoint literal `_type` branches are separate. For other conditions, conservatively skip uncertain cross-branch pairs rather than add a theorem prover.
- Emit one finding per repeated reference group in the smallest relevant projection; do not repeat it on each ancestor projection.
- Match the two Rabobank groups above; do not flag Landal's separate menu/submenu references or normal repeated fragment use in distinct array items.
- Message: suggest projecting the reference once where appropriate. No automatic rewrite; aliases, null behavior and `^` depth can change.

### `groq-max-query-size`

- One numeric option: `{ maxBytes: 10240 }`, integer >= 1. This is a configurable review budget modeled on upstream's warning threshold, not a server limit or latency guarantee.
- Count `Buffer.byteLength(expandedText, 'utf8')`, not JavaScript `string.length` and not only raw template quasis.
- Prefer reporting final query roots: direct query tags, known Sanity fetch inputs, or the query member produced by supported `[query, params]` builders. Do not warn at every reusable fragment definition.
- For unresolved roots, a known-text byte lower bound may justify an explicitly worded “at least N bytes” report when it already exceeds the budget. Never claim an exact total or a within-budget result with unresolved contributions.
- The complete query template at Rabobank `src/routeMap.js:635` must trigger. Landal's measured resolved examples remain below the default. No autofix and no assertion about server deprioritization.

### Deferred rules and explicit exclusions

| Candidate | Decision for this handoff |
| --- | --- |
| join-in-filter | No hits in the resolved corpus; retain parser support and negative fixtures, defer the rule until an actual case or explicit preventive requirement appears |
| deep-pagination / large-pages / parameterized pagination | No hits; observed `[0]` and `[0..1]` are not evidence for offset-pagination policing |
| computed-value-in-filter | No hits in the resolved corpus; do not flag array concatenation in a projection |
| non-literal-comparison | The observed candidate is `lower($recruiterEmail)`; defer until dependency analysis can distinguish query constants from document data |
| order-on-expr | One intentional language-preference sort; keep as a manual review item, defer default linting |
| repeated correlated count | Slug uniqueness uses a top-level count; that is not evidence of a correlated count problem |
| match-on-id | No observed use |
| many-joins | Keep as optional benchmark/corpus metadata, not an initial warning |
| join-to-get-id | Found in external image helper; dependency review and null-semantics analysis first |
| extremely-large-query | No need for a second overlapping rule; configure the size rule |
| unknown-field / invalid-type-filter | Would require trustworthy schema snapshots and scope/type analysis; runtime `$type` is legitimate |
| blanket no-interpolation / no-spread / require-language | Conflicts with composition, Portable Text and known language-independent content |
| formatting rules | No demonstrated correctness problem; preserve existing styles |
| Sanity schema-object rules | Separate scope from GROQ linting; do not copy the upstream schema preset |
| GROQ injection/security analysis | This corpus study did not trace untrusted data; do not call unresolved interpolation an injection vulnerability |

## 6. Library shape and parser decision

Suggested starting layout; merge tiny modules where that reads better:

```text
machinery/groq/
  index.js                 # ESLint-facing registration helper
  extract.js               # Binding recognition, fragment/root context
  resolve.js               # Bounded static composition, source ownership
  parser.js                # Stable internal parser interface
  scan.js                  # Only if a separate scanner improves clarity
  walk.js                  # Explicit child relationships, scope events
  source.js                # Cooked query ranges -> local JS locations
rules/groq-valid-syntax/{index.js,test.js,readme.md}
rules/groq-no-duplicate-conditional-projection/{index.js,test.js,readme.md}
rules/groq-repeated-dereference/{index.js,test.js,readme.md}
rules/groq-max-query-size/{index.js,test.js,readme.md}
```

Do not turn `machinery/ast.js` into a GROQ parser. Its helpers understand JavaScript/JSX. In particular, `getPropertyName()` picks one side of conditional/binary expressions; it cannot establish a statically known query string.

Keep each rule's checks in its rule module. A helper such as `createGroqVisitors(context, visitors)` can register `Dereference`, `ConditionalProjection`, `Query` and exit handlers. One traversal dispatches enabled visitors; rules retain their own `context.report`, options and message IDs. This is a suggested internal API, not a public API commitment. Avoid a central analyzer containing four hardcoded rule implementations.

### Handwritten parser prototype

Use a scanner/direct precedence-climbing or Pratt parser building syntax nodes with UTF-16 start/end offsets. Do not build an executable query representation, evaluator, type evaluator, parser-generator framework, WASM module or generic visitor-selector language.

Required corpus grammar:

- Whitespace and line comments, including end-of-file comments; both quote styles and escapes.
- Identifiers, numbers, strings, null, booleans, `$parameters`, `*`, `@`, `^` and repeated parents.
- Attribute/index/bracket access, including `@['_type']`, `alt[$language]`, `source->._id`, array traversal and `->` with optional projection.
- Filter predicates, chained filters, object/array expressions, projection splats, conditional splats, aliases and standalone field/branch lists.
- Precedence/associativity for observed logical/comparison/arithmetic operators, `in`, ranges/slices and array `+`.
- Generic function/namespace calls, pipe calls, `asc`/`desc`, `select` alternatives and fallback.
- Preserve bracket expression syntax; use only the small constant evaluator needed to distinguish filters/element access and literal slice bounds. Test integer, string, parameter and arithmetic cases against the chosen GROQ version.

Additional language features, such as custom `fn` declarations and delta selectors, must be explicitly classified if unsupported. They were not observed in this census. The prototype is a lint-oriented parser for a declared grammar, not a claimed replacement for all of `groq-js`.

Nodes should have consistent fields per kind, ordinary readable string `type` values, and direct child references. Avoid repeated array concatenation/prepending, unnecessary AST copies and persistent parent arrays. Do not introduce numeric tags, typed-array arenas or pooling without measured benefit. Depth/size limits must produce a coverage outcome, not a stack overflow or fabricated syntax error.

## 7. Composition, locations and cache lifecycle

### Static composition boundaries

Recognize imported bindings and aliases, including ESM default and CommonJS requires. Respect shadowing. No `defineQuery` uses were found; supporting it later is straightforward but not a priority that should delay the observed forms.

Resolve only a defined subset:

1. String/template literals, immutable local/imported constants, static object properties, arrays.
2. Simple helpers with supported local constants and a returned template, and pure functions/methods returning `[query, params]`. Resolve the query member lazily: runtime values in the parameter bag must not make an otherwise known query unresolved.
3. Static argument substitution for the observed projection/field-list builders; no arbitrary loops, mutation or application evaluation.
4. `JSON.stringify`, `Object.values` and array `.join` only with fully known plain values and verified unshadowed built-ins.
5. Explicit import mapping for Kaliber's `/...` -> project `src` and relative files. Inspect/reuse the convention in `lib/absolute-path-resolver-plugin.js` without coupling to undocumented resolver internals. Do not interpret `/groq/...` as `/groq` on disk.
6. A narrow version-tested adapter or statically interpreted source contract for `@kaliber/sanity-kaliber-image/sanity`. Unsupported versions yield unknown expansion, not guessed output.

Never `require`, dynamically import or `eval` an application/dependency module to recover a query. A const object is not proof its fields never mutate; reject relevant writes/escapes outside the supported model. Detect cyclic value expansion while allowing harmless cyclic import graphs.

Set explicit budgets for expansion bytes, dependency depth, helper depth and parser nesting; establish initial defaults against this corpus (the largest known template is 63,419 bytes, so a tiny limit would hide the main case). Tests must cover exhaustion and guarantee termination. Instrument unresolved reasons for the corpus report without emitting a user-facing lint warning for every unknown fragment.

### Partial templates

The initial supported path is full static expansion. For unresolved composition, retain literal segments and interpolation boundaries; do not replace `${...}` with arbitrary GROQ parameters and pretend the result is equivalent.

Conservative partial analysis can inspect a syntactically closed, independently understood local subtree. Unknown chunks can contain delimiters or change scope, so do not continue semantic traversal across a hole unless its role is proven by the supported builder contract. Unknown interpolation inside a quoted GROQ string is particularly different from an expression hole.

Track outcomes such as `complete`, `partial`, `unsupported`, `invalid`; each includes a reason and provenance. Ordinary unresolved helper definitions should not flood ESLint with diagnostics. Corpus coverage is the visibility mechanism. A later capability may instantiate those definitions at supported call sites.

### Source ownership and diagnostics

Use a segment map from expanded UTF-16 query ranges to source file and original template ranges. Cooked JavaScript escapes, CRLF, Unicode surrogate pairs, interpolation delimiters and synthetic fragment wrappers need tests. Size accounting remains UTF-8 separately.

An ESLint rule can report only in the current file. For local syntax/rule findings, highlight the real local range. For findings originating entirely in imported fragments, prefer the fragment's owning file when that fragment is linted; do not repeat them at every consumer. For root-level size findings or cross-fragment findings, report at the local composition/query site with clear provenance. For dependency-owned findings, use a local call-site advisory only if deliberately enabled; never pretend the dependency offset belongs to the caller. Duplicate suppression must not depend on which file ESLint visits first.

### Shared work and lifecycle

- Cache query extraction, expansion and parse results by `SourceCode`/node, fragment mode and relevant settings. Do not retain rule contexts or report callbacks in reusable parse caches.
- Active visitor registration is per lint invocation. Ensure it resets even when the same `SourceCode` is verified again with different enabled rules or options. Parse caches may be reused only for identical inputs; findings/configuration must not leak.
- Parse each unique expansion/mode at most once per applicable cache lifetime, then traverse once for all registered checks. A size-only run should not need a GROQ AST.
- Imported-file caches must account for dependency content changes; invalidation must work in a long-lived editor process. Prefer bounded per-invocation caches initially over an unbounded global filename cache.
- Dispatch only interested handlers. Use stack push/pop for scope state and explicit child relationships. Analyze neither JS parent links nor parser metadata as GROQ children.
- Keep parser loading lazy so unrelated JS files and runs with no GROQ rules enabled avoid that work.

## 8. Implementation sequence and acceptance gates

### A. Capture fixtures and a reproducible baseline

- Add a corpus collector accepting explicit project roots; do not hardcode absolute developer paths into production code or CI tests.
- Persist minimal representative fixtures for all composition forms and the positive/negative rule cases. Avoid copying unrelated application source into the plugin.
- Record unresolved inputs separately. Reproduce the 45/88 resolved baseline on the recorded revisions, or explain differences with source/version evidence.
- Add scripts for parser comparison, selected-rule comparison, full ESLint timing and coverage reporting. Keep test-only `groq-js` and upstream comparison tooling out of production dependencies when the custom parser ships.

### B. Implement recognition, composition and source mapping

- Cover import identity, aliases/shadowing, local/imported fragments, `snippets.*`, helper methods, static serialization, quoted interpolation and the image helper.
- Verify the known unresolved definitions remain non-errors without call-site bindings.
- Test edited imported files, cyclic imports vs cyclic values, repeated reuse, and unsupported helper bodies.
- Preserve standalone predicates and field lists without requiring applications to rewrite their source into `defineQuery`.

### C. Prototype and gate the parser

- Implement the corpus grammar with ranges and explicit failure outcomes.
- Differentially test acceptance and selected structural facts against pinned `groq-js` 1.30.3, using official syntax/spec fixtures for precedence and edge cases. Do not compare ASTs byte-for-byte: ours deliberately preserves syntax and source locations.
- Include malformed inputs, nested scopes, escaped strings, comments, long projections and deep nesting. An upstream acceptance difference requires investigation, not automatic deference; document spec/version differences.
- Gate: no regressions on the declared supported corpus/fixtures, useful locations, bounded resource use, and repeatable measured benefit over a cached parser baseline. If improvement is within noise or coverage drops, keep `groq-js` behind the parser boundary and report that outcome. Do not conceal missing source-range capabilities in that fallback.

### D. Shared traversal and four rule modules

- Implement common scope/visitor machinery and independent rules in section 5.
- Ensure rule order and enabled-rule subsets do not change another rule's findings. Confirm each rule honors its own severity, options and ESLint disable directives.
- Use `machinery/test.js` and normal `meta.messages`, `meta.schema`, documentation URLs and rule registration.
- Keep syntax handling independently testable. Unsupported inputs must not cause unrelated ESLint rule crashes.

### E. Corpus review and opt-in rollout

- Run only the new rules across both reference corpora, using temporary configs/API configuration rather than editing those projects.
- Review each reported source group. Deliver counts by rule and unique owning location, plus complete/partial/unsupported coverage.
- Confirm Landal's duplicate and the two Rabobank dereference groups are detected, with no nested-menu conflation.
- Verify size reporting on Rabobank's fully expanded root, without a warning at every contributing fragment.
- Add the separate GROQ config/preset, per-rule readmes, a composition/limitations document and benchmark commands/results.
- Run focused tests during implementation, then `pnpm test` and `pnpm lint`; distinguish pre-existing failures if any. This research task did not establish a full repository test baseline.

## 9. Test matrix that must survive the handoff

| Area | Required cases |
| --- | --- |
| Identification | ESM default/alias, CJS require, shadowed `groq`, unrelated functions/tags, no GROQ in file |
| Fragments | field lists, predicates, objects, conditional lists, helper arguments, imported member fragments |
| Composition | interpolation in strings; JSON/Object.values; `.join`; image helper version; cycles and mutation |
| Syntax | `[0]`, `[0..1]`, `[]`, dynamic bracket, `->._id`, `@{}`, `@->`, nested `^`, select, array concatenation, comments |
| Duplicate branches | Landal positive; different bodies allowed; different scopes allowed; unsafe intervening writes not treated as redundant; unknown function bodies skipped |
| Repeated dereferences | Rabobank positives; exact full paths; independent arrays; disjoint type branches; parent scope; fallback-only repeats; no ancestor duplicates |
| Size | UTF-8 vs UTF-16; exact boundary; fully expanded imports; partial lower bounds; shared fragments report at root only |
| Locations | CRLF, multiline, escaped newline/quote, non-BMP Unicode, local vs imported ownership, no fixes across holes |
| Lifecycle | same file repeated, same SourceCode reused, options/enablement changes, dependency edits, bounded caches |
| Performance | no-GROQ files, one rule vs all four, small queries, real 63 KiB expansion, deep/large hostile input |

## 10. Performance baseline and honest success criteria

A small exploratory parser-only timing was run on Node v26.8.1 with installed `groq-js` 1.30.3. Query strings were already statically expanded. Five warm-up batches, then fifteen measured batches, each parsing every resolved template once:

| Batch | Templates | Input bytes including field-list wrappers | Median | Range |
| --- | ---: | ---: | ---: | --- |
| Landal | 45 | 53,112 | 4.17 ms | 3.88–4.62 ms |
| Rabobank | 88 | 664,737 | 55.64 ms | 51.22–59.97 ms |

This excludes imports, cold startup, JS parsing, composition, rules, reporting and I/O. It is not an end-to-end performance claim. Different runs/machines/Node versions will differ; collect a fresh baseline in the committed harness.

Compare at least:

1. Actual upstream ESLint integration, with equivalent supported rules/inputs where possible.
2. Local shared integration using pinned `groq-js`.
3. Same local integration using the handwritten parser, with identical supported inputs/checks.

Keep comparisons honest: upstream's default extraction does not reconstruct this project's fragments like our collector, so report extraction coverage separately. Distinguish WASM default from forced TypeScript comparisons. Do not compare repeated upstream parsing with cached custom parsing and attribute the whole improvement to the parser.

Measure cold process startup, warm wall time, parse/expansion/walk counts, peak memory and repeated editor-style runs. Use fresh processes for cold timings, multiple repetitions, recorded Node/V8/package versions and corpus hashes. Include supported Node 22/24 environments where available; the exploratory Node 26 result is not a substitute.

Structural success criteria: zero GROQ parses on no-query files; no repeated parsing of an identical query/mode within the same analysis; one semantic traversal for all enabled visitors; no AST traversal for size-only checks; no stale findings after file/config/dependency changes. Performance claims require equal coverage and improvements beyond run-to-run variability, not just a faster synthetic expression benchmark.

## 11. Completion checklist

- [ ] Four specified rules implemented and registered with hyphenated public keys.
- [ ] Existing query formatting and composition forms work without source migrations.
- [ ] Known corpus and unresolved definitions accounted for; no “all clean” claim hiding skips.
- [ ] Parser decision backed by compatibility, location and benchmark evidence.
- [ ] Rule logic remains in rule modules; shared machinery owns reusable traversal/scope/extraction.
- [ ] Positive findings and false-positive guards in sections 4/9 are tested.
- [ ] Source ownership and editor cache invalidation verified.
- [ ] Separate opt-in GROQ preset and clear limitations documented.
- [ ] Reproducible benchmark/corpus commands; normal plugin tests and lint completed.
- [ ] No unrequested application changes, deployment or publication.

## 12. Primary references

- [Upstream ESLint adapter](https://github.com/sanity-labs/sanity-lint/blob/8a4247dc9b98d7c3fa4f97c8dadcf4c49e863b68/packages/eslint-plugin/src/utils/rule-factory.ts): per-rule lint invocation.
- [Upstream extractor](https://github.com/sanity-labs/sanity-lint/blob/8a4247dc9b98d7c3fa4f97c8dadcf4c49e863b68/packages/eslint-plugin/src/utils/groq-extractor.ts): name matching and interpolation placeholders.
- [Upstream TS repeated-dereference rule](https://github.com/sanity-labs/sanity-lint/blob/8a4247dc9b98d7c3fa4f97c8dadcf4c49e863b68/packages/groq-lint/src/rules/repeated-dereference.ts).
- [Upstream walker](https://github.com/sanity-labs/sanity-lint/blob/8a4247dc9b98d7c3fa4f97c8dadcf4c49e863b68/packages/groq-lint/src/walker.ts) and [WASM adapter](https://github.com/sanity-labs/sanity-lint/blob/8a4247dc9b98d7c3fa4f97c8dadcf4c49e863b68/packages/groq-lint/src/wasm-linter.ts).
- [groq-js raw parser](https://github.com/sanity-io/groq-js/blob/06ccb20914d3b92934bf95fd966ba53d87271d95/src/rawParser.js) and [AST construction](https://github.com/sanity-io/groq-js/blob/06ccb20914d3b92934bf95fd966ba53d87271d95/src/parser.ts).
- [GROQ specification versions](https://spec.groq.dev/): select a version explicitly when documenting grammar support.
- [GROQ syntax](https://www.sanity.io/docs/specifications/groq-syntax) and [pipeline components](https://www.sanity.io/docs/specifications/groq-pipeline-components).
- [Sanity high-performance GROQ](https://www.sanity.io/docs/developer-guides/high-performance-groq): engine guidance, distinct from local ESLint performance.
- [ESLint custom rules](https://eslint.org/docs/latest/extend/custom-rules).

If copying upstream code/tests, preserve applicable license notices and attribution. The objective is code that fits this repository and proves its behavior, not a claim that upstream code is categorically worse.
