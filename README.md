# @kaliber/eslint-plugin

This ESLint plugin enforces Kaliber's code conventions, helping maintain consistency across projects.

## Usage

To use this plugin in your project, create an `eslint.config.js` file with the following content:

```js
const kaliberConfig = require('@kaliber/eslint-plugin/eslint.config')

module.exports = [
  ...kaliberConfig,
  // your project-specific overrides here
]
```

## Migrating from legacy config

If your project still uses a legacy `.eslintrc` / `.eslintrc.json` / `.eslintrc.js` file, you can automatically migrate to the flat config format:

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

After running, review the generated `eslint.config.js` and delete your old `.eslintrc` file.

## Globals

Instead of depending on the [`globals`](https://www.npmjs.com/package/globals) npm package, this plugin uses an inlined [`machinery/globals.json`](machinery/globals.json) containing only the environments we need (`browser`, `node`, `jest`). To update the globals definitions, replace the contents of that file with the relevant entries from the upstream source.

## Publishing a new version

To publish a new version, run the following commands:

```sh
>> yarn publish
>> git push
>> git push --tags
```
