# security-no-timing-unsafe-secret-comparison

Do not compare secrets with ===.

## Why it matters

String comparison short-circuits at the first differing byte, leaking the result byte-by-byte through response timing. crypto.timingSafeEqual exists for exactly this.

## Incorrect

```js
if (submittedToken === storedToken) grant()
```

## Correct

```js
crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b))
```

## Limitations

Stated honestly: Identifier names gate the rule (secret/token/password/signature/apikey patterns); secrets held under innocent variable names are missed by design. Low severity: exploitation requires statistical timing data.

## Prior art

CWE-208, Cryptocat 2013 disclosure

Warn level in `configs.security`; scores, sources and references in docs/research/rule-inventory.yaml.
