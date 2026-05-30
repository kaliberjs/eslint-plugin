# @kaliber/eslint-plugin

Opinionated ESLint plugin enforcing Kaliber's code conventions. Bundles custom rules, curated third-party rules, and formatting conventions into a single shareable configuration.

## Usage

Create an `eslint.config.js` file in your project root:

```js
const kaliberConfig = require('@kaliber/eslint-plugin/eslint.config')

module.exports = [
  ...kaliberConfig,
  // your project-specific overrides here
]
```

## Custom rules

| Rule | Description |
|---|---|
| [`component-properties`](docs/component-properties.md) | Destructure component props, use spread passing for same-name props, and avoid passing state setters as props |
| [`layout-class-name`](docs/layout-class-name.md) | Components are black boxes — use layoutClassName for positioning instead of className |
| [`naming-policy`](docs/naming-policy.md) | Enforce naming conventions for components, CSS files, CSS variables, root class names, and refs |
| [`no-default-export`](docs/no-default-export.md) | Prefer named exports over default exports — except in App, template, and page files |
| [`no-relative-parent-import`](docs/no-relative-parent-import.md) | Disallow ../ imports — use root-slash imports that survive file moves |
| [`import-sort`](docs/import-sort.md) | Enforce grouped and ordered import statements with auto-fix support |
| [`jsx-key`](docs/jsx-key.md) | Require key prop in iterators but allow keyless JSX in array-literal DSL patterns |
| [`position-center`](docs/position-center.md) | Avoid place-content: center — it only aligns tracks and often does nothing |
| [`todo-ticket-reference`](docs/todo-ticket-reference.md) | Require TODO comments to reference a Jira ticket |

### Tracking rules (data-x)

| Rule | Description |
|---|---|
| [`data-x-required`](docs/data-x-required.md) | Every `<a>` and `<button>` must have a data-x tracking attribute |
| [`data-x-context`](docs/data-x-context.md) | Elements with data-x must also include data-x-context to identify page location |
| [`data-x-latin-only`](docs/data-x-latin-only.md) | data-x values must use ASCII characters only — no accented or non-Latin characters |
| [`data-x-clickout-prefix`](docs/data-x-clickout-prefix.md) | External links (http/https) must use the clickout- prefix in data-x |
| [`data-x-cta-prefix`](docs/data-x-cta-prefix.md) | Call-to-action `<a>` elements must use the cta- prefix in data-x |
| [`data-x-toggle-prefix`](docs/data-x-toggle-prefix.md) | Toggle/accordion elements must use the toggle- prefix in data-x |
| [`data-x-onpage-action-format`](docs/data-x-onpage-action-format.md) | On-page actions must follow the action-target format (e.g. scroll-applyform, open-modal) |
| [`data-x-unique-id`](docs/data-x-unique-id.md) | Repeated elements with the same data-x must include data-x-id for disambiguation |
| [`data-x-sectioning-elements`](docs/data-x-sectioning-elements.md) | Sectioning HTML elements (section, header, footer, nav, etc.) must have data-x |
| [`data-x-form-naming`](docs/data-x-form-naming.md) | Form elements must have a data-x value ending with -form |

## Documentation

Rule documentation lives in [`docs/`](docs/). Each rule has a corresponding markdown file explaining what it enforces, why, and showing valid/invalid examples.

### Convention

The doc filename **must match the rule's directory name** under `rules/`. This is not just a convention — the [`docsUrl`](machinery/docsUrl.js) helper derives the documentation path from the rule's `__dirname`:

```
rules/data-x-clickout-prefix/index.js  →  docs/data-x-clickout-prefix.md
rules/naming-policy/index.js           →  docs/naming-policy.md
```

Each rule exposes two pieces of metadata via `meta.docs`:

- **`description`** — a one-liner explaining what the rule enforces. This is the primary context for both editor tooltips and AI coding assistants. LLMs that parse ESLint output see this inline without needing to follow any link.
- **`url`** — a `file://` URL pointing to the full documentation on disk. It resolves locally regardless of where the package is installed (source checkout or `node_modules`), so it works without network access or GitHub authentication.

This makes rule violations self-documenting: a developer hovering over an error in VS Code sees the description and a clickable link to the full explanation. An LLM assisting with code sees the description in the lint output and can read the referenced file for deeper context on why the rule exists and how to fix violations.

### Adding documentation for a new rule

1. Create `docs/{rule-name}.md`
2. In the rule's `index.js`, add:
   ```js
   const docsUrl = require('../../machinery/docsUrl')

   module.exports = {
     meta: {
       type: 'problem',
       docs: {
         description: 'One-line description of the rule',
         url: docsUrl(__dirname),
       },
     },
     // ...
   }
   ```

## Migrating from legacy config

If your project still uses a legacy `.eslintrc` file, you can automatically migrate to the flat config format:

```sh
npx @kaliber/eslint-plugin migrate

# Preview without writing any files:
npx @kaliber/eslint-plugin migrate --dry-run

# Overwrite an existing eslint.config.js:
npx @kaliber/eslint-plugin migrate --force
```

The migration script will:
- Rename deprecated rules (e.g. `no-native-reassign` → `no-global-assign`)
- Move stylistic rules to the `@stylistic` namespace
- Remap `import/` rules to `import-x/`
- Remove rules with no ESLint v9 replacement
- Diff your rules against the shared Kaliber config and only keep project-specific overrides
- Preserve custom globals and `ignorePatterns`

## Globals

Instead of depending on the [`globals`](https://www.npmjs.com/package/globals) npm package, this plugin uses an inlined [`machinery/globals.json`](machinery/globals.json) containing only the environments we need (`browser`, `node`, `jest`).

## Publishing

```sh
>> yarn publish
>> git push
>> git push --tags
```
