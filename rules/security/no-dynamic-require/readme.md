# security-no-dynamic-require

Do not resolve modules from dynamic specifiers.

## Why it matters

The module graph stops bounding what can be loaded; a tainted specifier becomes an arbitrary-module or arbitrary-file load. The fix is a static import or a literal-keyed lookup table over statically imported modules.

## Incorrect

```js
require(`./plugins/${name}`)
```

## Correct

```js
const PLUGINS = { a: require('./a'), b: require('./b') }; PLUGINS[name]
```

## Limitations

Stated honestly: createRequire bound to a variable (r2(p)) is a documented miss; only the chained form is matched.

## Prior art

eslint-plugin-security detect-non-literal-require, CodeQL js/unsafe-code-injection

Warn level in `configs.security`; scores, sources and references in docs/research/rule-inventory.yaml.
