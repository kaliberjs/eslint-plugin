# security-no-plain-http-url

No cleartext http:// or ws:// requests to non-localhost endpoints.

## Why it matters

Credentials, tokens and response bodies are readable and modifiable by any network observer on the path. Literal URLs only — scheme-from-variable is invisible to us and claiming otherwise would be a lie.

## Incorrect

```js
fetch('http://api.example.com/x')
```

## Correct

```js
fetch('https://api.example.com/x')
```

## Limitations

Stated honestly: localhost/127.0.0.1 is exempt as the development hatch. URLs built at runtime are covered by taint rules (dangerous-url-construction) instead.

## Prior art

SonarJS S5244, Semgrep plain-http

Warn level in `configs.security`; see docs/research/rule-inventory.yaml for scores, sources and references.
