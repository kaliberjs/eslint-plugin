# security-no-static-iv

Do not use a fixed initialization vector.

- **Preset:** `security-audit` only (`warn`). Deliberately not in `configs.security`.
- **Impact if exploited:** medium
- **Analysis confidence:** high for a call resolved to a `node:crypto` import, medium for a bare name match (crypto-js ships as a CDN global with no import to resolve).
- **CWE:** [CWE-329: Generation of Predictable IV with CBC Mode](https://cwe.mitre.org/data/definitions/329.html), [CWE-1204: Generation of Weak Initialization Vector (IV)](https://cwe.mitre.org/data/definitions/1204.html)
- **CAPEC:** [CAPEC-20](https://capec.mitre.org/data/definitions/20.html), [CAPEC-97](https://capec.mitre.org/data/definitions/97.html)
- **OWASP:** [A04:2025 – Cryptographic Failures](https://owasp.org/Top10/2025/A04_2025-Cryptographic_Failures/) · [A02:2021 – Cryptographic Failures](https://owasp.org/Top10/A02_2021-Cryptographic_Failures/) (previous edition)
- **ASVS 5.0:** `v5.0.0-11.3.4` — "Verify that nonces, initialization vectors, and other single-use numbers are not used for more than one encryption key and data-element pair. The method of generation must be appropriate for the algorithm being used."

## Why it matters

Reused IVs make equal plaintexts observable and enable chosen-plaintext attacks; the IV must be fresh per encryption and is sent alongside the ciphertext anyway. crypto.randomBytes(16) per call is the remediation; GCM counter nonces with documented uniqueness are the accepted exception (deliberately not flagged).

## Incorrect

```js
crypto.createCipheriv('aes-256-cbc', key, '0123456789abcdef')
```

## Correct

```js
crypto.createCipheriv('aes-256-cbc', key, crypto.randomBytes(16))
```

## Limitations

Stated honestly: Only static-by-construction values are flagged (literals, Buffer.from/alloc of literals); an IV from config is invisible. Monotonic-counter nonces for GCM will still flag - disable on the line with a comment if that is your documented scheme.

## Prior art

Semgrep node-crypto rules, CWE-329

## References

- [CWE-329](https://cwe.mitre.org/data/definitions/329.html)
- [CWE-1204](https://cwe.mitre.org/data/definitions/1204.html)
- [OWASP Cryptographic Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html)
- [nodejs.org](https://nodejs.org/api/crypto.html)

Scores, sources and references in `docs/research/rule-inventory.yaml`.
