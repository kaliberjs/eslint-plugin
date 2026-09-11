# security-no-md5

Do not use MD5 for any security purpose.

- **Preset:** `security-audit` only (`warn`). Deliberately not in `configs.security`.
- **Impact if exploited:** medium
- **Analysis confidence:** high for a call resolved to a `node:crypto` import, medium for a bare name match (crypto-js ships as a CDN global with no import to resolve).
- **CWE:** [CWE-328: Use of Weak Hash](https://cwe.mitre.org/data/definitions/328.html)
- **CAPEC:** [CAPEC-461](https://capec.mitre.org/data/definitions/461.html), [CAPEC-68](https://capec.mitre.org/data/definitions/68.html)
- **OWASP:** [A04:2025 – Cryptographic Failures](https://owasp.org/Top10/2025/A04_2025-Cryptographic_Failures/) · [A02:2021 – Cryptographic Failures](https://owasp.org/Top10/A02_2021-Cryptographic_Failures/) (previous edition)
- **ASVS 5.0:** `v5.0.0-11.4.1` — "Verify that only approved hash functions are used for general cryptographic use cases, including digital signatures, HMAC, KDF, and random bit generation. Disallowed hash functions, such as MD5, must not be used for any cryptographic purpose."
- **ASVS 5.0:** `v5.0.0-11.4.3` — "Verify that hash functions used in digital signatures, as part of data authentication or data integrity are collision resistant and have appropriate bit-lengths. If collision resistance is required, the output length must be at least 256 bits. If only resistance to second pre-image attacks is required, the output length must be at least 128 bits."

## What it detects

```js
crypto.createHash('md5')          // also 'MD5', 'ssl3-md5', destructured import
crypto.createHmac('md5', key)
CryptoJS.MD5(password)
CryptoJS.HmacMD5(message, key)
```

MD5 has been collision-broken since 2004. It must not be used for
signatures, integrity guarantees, token derivation or password storage.

## The honest tension

MD5-for-cache-keys, ETags and content-addressed build artifacts is
legitimate and common. This rule **still reports those**, because it cannot
know intent from syntax — pretending otherwise would be a heuristic guessing
at purpose. The documented escape hatch is a line disable with a comment:

```js
// eslint-disable-next-line @kaliber/security-no-md5 -- cache key, not integrity
const cacheKey = crypto.createHash('md5').update(url).digest('hex')
```

That comment is the point: it records that someone saw the usage and judged
it non-cryptographic.

## Correct replacements

| Purpose | Use |
|---|---|
| Integrity / content identity | SHA-256 |
| Authentication | HMAC-SHA256 |
| Password storage | bcrypt or argon2 — never a bare hash |

## Limitations

- Algorithm name from a variable or config is not flagged.
- MD5 inside a dependency is invisible.
- Exact hash names only: a longer string that merely contains "md5" is left
  to the reader rather than guessed at.

## Prior art

CodeQL `js/weak-cryptographic-algorithm`, SonarJS S4790.

## References

- [Node.js crypto docs](https://nodejs.org/api/crypto.html)
- [OWASP Cryptographic Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html)

Scores, sources and references in `docs/research/rule-inventory.yaml`.
