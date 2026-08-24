# security-no-javascript-url

No javascript: URLs in navigation positions.

## Why it matters

The URL body executes as script when the link or frame activates — XSS without any injection elsewhere. Literal-only slice; computed values belong to the DOM-XSS registry once grown.

## Incorrect

```js
<a href='javascript:void(0)'>
```

## Correct

```js
button + event handler
```

## Limitations

Stated honestly: Computed href values (router params etc.) are a documented miss until the taint layer covers URL sinks.

## Prior art

eslint-plugin-security safe-lookup, SonarJS S5247 sibling family

Warn level in `configs.security`; see docs/research/rule-inventory.yaml for scores, sources and references.
