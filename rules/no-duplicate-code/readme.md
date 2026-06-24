# no-duplicate-code

Detects structural code duplication across project files. When you write code that already exists elsewhere, this rule tells you **where** the canonical implementation lives so you can import it instead.

## How it works

On first lint, the rule scans all source files and builds a map of duplicated code blocks (≥ 6 normalised lines). For each group, it selects a **canonical source** and only warns on the copies.

### Canonical source heuristic

| Priority | Signal | Rationale |
|----------|--------|-----------|
| 1 | Path contains `shared/`, `machinery/`, `lib/`, `utils/`, `helpers/`, `common/` | Designed for shared code |
| 2 | Shallowest path depth | More foundational |
| 3 | Alphabetically first | Deterministic tiebreaker |

### Two-tier messaging

| Layer | Audience | Content |
|-------|----------|---------|
| **message** | Humans (Problems panel) | `Duplicated code (27 lines) — consider reusing Content.js:265-291` |
| **suggest** | LLMs / "Explain and Fix" | Code preview + `Delete this block and import from X instead` |

## Examples

### ❌ Duplicating existing code

```js
// src/features/content/NewPage.js
function ContentBlock({ data }) {
  switch (data._type) {
    case 'podcast': return <ContainerSm><Podcast title={data.title} /></ContainerSm>
    case 'image': return <ContainerLg><InlineImage image={data} /></ContainerLg>
    // ... 20 more duplicated cases
  }
}
```

```
⚠ Duplicated code (27 lines) — consider reusing src/features/buildingBlocks/Content.js:265-291
  eslint(@kaliber/no-duplicate-code)

💡 Replace with import from Content.js:265-291. The existing code starts with:
   switch(data._type){, case'introWithTitle':return(, <ContainerLgstyleContext='light'{...containerProps}>
   (24 more lines). Delete this block and import/reuse from Content.js instead.
```

### ✅ Importing the shared implementation

```js
import { ContentBlock } from '../buildingBlocks/Content'

function NewPage({ content }) {
  return content.map((data, i) => <ContentBlock key={i} data={data} />)
}
```

## Configuration

```js
// eslint.config.js — enabled by default via @kaliber/eslint-plugin
rules: {
  '@kaliber/no-duplicate-code': 'warn',  // or 'error'
}
```

### Options

```js
'@kaliber/no-duplicate-code': ['warn', {
  // Minimum normalised lines for a block to count as duplication (default: 6)
  minLines: 8,

  // Directories to scan, relative to project root (default: ['src', 'config', 'services'])
  scanDirs: ['src', 'lib'],
}]
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `minLines` | integer (≥ 3) | `6` | Minimum normalised lines to consider as duplication |
| `scanDirs` | string[] | `['src', 'config', 'services']` | Directories to scan (relative to project root) |

## Detection algorithm

1. **Normalise** each file: strip comments, collapse whitespace, normalise quotes, remove trailing commas
2. **Slide** a 6-line window across normalised lines
3. **Match** windows with identical content across files
4. **Expand** adjacent matches into maximal clones

Scanner is V8-optimised (charCodeAt state machine, no regex on hot path). Typical: 700+ files in ~100ms.
