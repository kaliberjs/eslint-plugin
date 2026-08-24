# security-no-disabled-security-framework-check

Do not disable security framework protections in configuration.

## Why it matters

helmet features and Electron webPreferences exist because the attacks they stop are common; switching them off silently re-opens the hole for every request or window.

## Incorrect

```js
app.use(helmet({ contentSecurityPolicy: false }))
```

## Correct

```js
app.use(helmet({ contentSecurityPolicy: { directives: {...} } }))
```

## Limitations

Stated honestly: Covers helmet disable flags and Electron webPreferences shapes; AngularJS $sce, graphql playground and debug flags are known misses for now.

## Prior art

CodeQL js/insecure-helmet-configuration, SonarJS S5739

Warn level in `configs.security`; scores, sources and references in docs/research/rule-inventory.yaml.
