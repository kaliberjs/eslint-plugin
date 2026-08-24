# security-no-permissive-cors

Do not reflect request origins into CORS with credentials enabled.

## Why it matters

Any website can read authenticated responses from your API as the victim: it sends the victim's browser to your endpoint, you echo its origin back with credentials allowed.

## Incorrect

```js
cors({ origin: true, credentials: true })
```

## Correct

```js
cors({ origin: ['https://app.example.com'] })
```

## Limitations

Stated honestly: Bare cors() and origin '*' on a public API are deliberately not flagged — info-level noise per the research entry. An allowlist regex with an unescaped dot is a known miss (regex allowlists are fragile in both directions).

## Prior art

SonarJS S5122, CodeQL js/cors-misconfiguration-for-credentials, Semgrep cors-misconfiguration

Warn level in `configs.security`; see docs/research/rule-inventory.yaml for scores, sources and references.
