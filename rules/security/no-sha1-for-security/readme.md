# security-no-sha1-for-security

Do not use SHA-1 where collision resistance matters.

## Why it matters

Collision-broken since SHAttered (2017). Same shape and honest tension as the md5 rule: warn-level, line-disable escape hatch for legitimate non-security uses.

## Incorrect

```js
createHash('sha1').update(data)
```

## Correct

```js
createHash('sha256').update(data)
```

## Limitations

Stated honestly: Exact hash names only; algorithm from config is a miss. SHA-1 inside HMAC for legacy protocols will still flag — that is intended documentation of risk.

## Prior art

SonarJS S4790 sibling, SHAttered attack

Warn level in `configs.security`; scores, sources and references in docs/research/rule-inventory.yaml.
