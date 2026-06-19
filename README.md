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
| [`component-properties`](rules/component-properties/readme.md) | Destructure component props, use spread passing for same-name props, and avoid passing state setters as props |
| [`layout-class-name`](rules/layout-class-name/readme.md) | Components are black boxes — use layoutClassName for positioning instead of className |
| [`naming-policy`](rules/naming-policy/readme.md) | Enforce naming conventions for components, CSS files, CSS variables, root class names, and refs |
| [`no-default-export`](rules/no-default-export/readme.md) | Prefer named exports over default exports — except in App, template, and page files |
| [`no-relative-parent-import`](rules/no-relative-parent-import/readme.md) | Disallow ../ imports — use root-slash imports that survive file moves |
| [`import-sort`](rules/import-sort/readme.md) | Enforce grouped and ordered import statements with auto-fix support |
| [`jsx-key`](rules/jsx-key/readme.md) | Require key prop in iterators but allow keyless JSX in array-literal DSL patterns |
| [`position-center`](rules/position-center/readme.md) | Avoid place-content: center — it only aligns tracks and often does nothing |
| [`todo-ticket-reference`](rules/todo-ticket-reference/readme.md) | Require TODO comments to reference a Jira ticket |

### Code-as-prose rules

These rules are available through the opt-in `configs.prose` preset. They are
strict readability checks, so adopt them per project before considering them for
the default Kaliber config.

| Rule | Description |
|---|---|
| [`prose-no-opaque-condition`](rules/prose-no-opaque-condition/readme.md) | Require complex conditions to be named predicates |
| [`prose-no-negated-property-chain`](rules/prose-no-negated-property-chain/readme.md) | Disallow negated property access such as `!response.data._type` |
| [`prose-prefer-named-array-callback`](rules/prose-prefer-named-array-callback/readme.md) | Require named callbacks for complex array operations |
| [`prose-no-magic-condition`](rules/prose-no-magic-condition/readme.md) | Disallow magic string, number, and regexp literals in conditions |
| [`prose-no-boolean-literal-arguments`](rules/prose-no-boolean-literal-arguments/readme.md) | Disallow bare true/false arguments at call sites |
| [`prose-no-opaque-identifiers`](rules/prose-no-opaque-identifiers/readme.md) | Disallow short and generic identifiers that hide intent |
| [`prose-predicate-names`](rules/prose-predicate-names/readme.md) | Require obvious boolean helpers and values to use predicate names |
| [`prose-no-section-comments`](rules/prose-no-section-comments/readme.md) | Disallow section comments inside functions when extraction would be clearer |
| [`prose-no-generic-function-names`](rules/prose-no-generic-function-names/readme.md) | Disallow implementation-detail and generic function names |
| [`prose-require-type-predicate-jsdoc`](rules/prose-require-type-predicate-jsdoc/readme.md) | Require type predicate JSDoc on predicate-named functions |

### Tracking rules (data-x)

| Rule | Description |
|---|---|
| [`data-x-required`](rules/data-x-required/readme.md) | Every `<a>` and `<button>` must have a data-x tracking attribute |
| [`data-x-context`](rules/data-x-context/readme.md) | Elements with data-x must also include data-x-context to identify page location |
| [`data-x-latin-only`](rules/data-x-latin-only/readme.md) | data-x values must use ASCII characters only — no accented or non-Latin characters |
| [`data-x-clickout-prefix`](rules/data-x-clickout-prefix/readme.md) | External links (http/https) must use the clickout- prefix in data-x |
| [`data-x-cta-prefix`](rules/data-x-cta-prefix/readme.md) | Call-to-action `<a>` elements must use the cta- prefix in data-x |
| [`data-x-toggle-prefix`](rules/data-x-toggle-prefix/readme.md) | Toggle/accordion elements must use the toggle- prefix in data-x |
| [`data-x-onpage-action-format`](rules/data-x-onpage-action-format/readme.md) | On-page actions must follow the action-target format (e.g. scroll-applyform, open-modal) |
| [`data-x-unique-id`](rules/data-x-unique-id/readme.md) | Repeated elements with the same data-x must include data-x-id for disambiguation |
| [`data-x-sectioning-elements`](rules/data-x-sectioning-elements/readme.md) | Sectioning HTML elements (section, header, footer, nav, etc.) must have data-x |
| [`data-x-form-naming`](rules/data-x-form-naming/readme.md) | Form elements must have a data-x value ending with -form |


## Documentation

Each rule is self-contained — implementation, tests, and documentation live together:

```
rules/naming-policy/
  index.js     ← rule implementation
  test.js      ← rule tests
  readme.md    ← rule documentation
```

The [`docsUrl`](machinery/docsUrl.js) helper resolves the `readme.md` from the rule's `__dirname`:

Each rule exposes two pieces of metadata via `meta.docs`:

- **`description`** — a one-liner explaining what the rule enforces. This is the primary context for both editor tooltips and AI coding assistants. LLMs that parse ESLint output see this inline without needing to follow any link.
- **`url`** — a `file://` URL pointing to the full documentation on disk. It resolves locally regardless of where the package is installed (source checkout or `node_modules`), so it works without network access or GitHub authentication.

This makes rule violations self-documenting: a developer hovering over an error in VS Code sees the description and a clickable link to the full explanation. An LLM assisting with code sees the description in the lint output and can read the referenced file for deeper context on why the rule exists and how to fix violations.

### Adding documentation for a new rule

1. Create `rules/{rule-name}/readme.md`
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

### Change package.json

Update the lint script in your `package.json` — the new flat config picks up `eslint.config.js` automatically, and `.gitignore` is used as the ignore file:

```json
"lint.javascript": "eslint"
```

Was:

```json
"lint.javascript": "eslint -c .eslintrc --ignore-path .gitignore './**/*.js'"
```

### Run the migration script

```sh
# In your project directory:
npx kaliber-eslint-migrate

# Preview without writing any files:
npx kaliber-eslint-migrate --dry-run

# Print the generated config to stdout:
npx kaliber-eslint-migrate --stdout

# Overwrite an existing eslint.config.js:
npx kaliber-eslint-migrate --force
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
