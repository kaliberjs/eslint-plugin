# security-no-sha1-for-security

Do not use SHA-1 where collision resistance matters.

- **Preset:** `security-audit` only (`warn`). Deliberately not in `configs.security`.
- **Impact if exploited:** medium
- **Analysis confidence:** high for a call resolved to a `node:crypto` import, medium for a bare name match (crypto-js ships as a CDN global with no import to resolve).
- **CWE:** [CWE-328: Use of Weak Hash](https://cwe.mitre.org/data/definitions/328.html)
- **CAPEC:** [CAPEC-461](https://capec.mitre.org/data/definitions/461.html), [CAPEC-68](https://capec.mitre.org/data/definitions/68.html)
- **OWASP:** [A04:2025 – Cryptographic Failures](https://owasp.org/Top10/2025/A04_2025-Cryptographic_Failures/) · [A02:2021 – Cryptographic Failures](https://owasp.org/Top10/A02_2021-Cryptographic_Failures/) (previous edition)
- **ASVS 5.0:** `v5.0.0-11.4.1` — "Verify that only approved hash functions are used for general cryptographic use cases, including digital signatures, HMAC, KDF, and random bit generation. Disallowed hash functions, such as MD5, must not be used for any cryptographic purpose."
- **ASVS 5.0:** `v5.0.0-11.4.3` — "Verify that hash functions used in digital signatures, as part of data authentication or data integrity are collision resistant and have appropriate bit-lengths. If collision resistance is required, the output length must be at least 256 bits. If only resistance to second pre-image attacks is required, the output length must be at least 128 bits."

## Why it matters

Collision-broken since SHAttered (2017). Same shape and the same honest tension as the md5 rule: legitimate non-security uses exist (git object ids, legacy interop), so this is an audit-only rule and the escape hatch is a line disable with a comment.

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

## References

- [CWE-328](https://cwe.mitre.org/data/definitions/328.html)
- [OWASP Cryptographic Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html)

Scores, sources and references in `docs/research/rule-inventory.yaml`.
