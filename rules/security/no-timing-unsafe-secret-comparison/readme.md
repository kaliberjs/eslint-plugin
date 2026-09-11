# security-no-timing-unsafe-secret-comparison

Do not compare secrets with ===.

- **Preset:** `security-audit` only (`warn`). Deliberately not in `configs.security`.
- **Impact if exploited:** medium
- **Analysis confidence:** medium — the rule can see the call shape but not the fact that decides exploitability.
- **CWE:** [CWE-208: Observable Timing Discrepancy](https://cwe.mitre.org/data/definitions/208.html)
- **CAPEC:** [CAPEC-462](https://capec.mitre.org/data/definitions/462.html)
- **OWASP:** **not mapped** in the 2025 edition — see `docs/research/owasp-coverage.md` · [A02:2021 – Cryptographic Failures](https://owasp.org/Top10/A02_2021-Cryptographic_Failures/) (previous edition)
- **ASVS 5.0:** `v5.0.0-11.2.4` — "Verify that all cryptographic operations are constant-time, with no 'short-circuit' operations in comparisons, calculations, or returns, to avoid leaking information."

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

## References

- [CWE-208](https://cwe.mitre.org/data/definitions/208.html)
- [nodejs.org](https://nodejs.org/api/crypto.html)

Scores, sources and references in `docs/research/rule-inventory.yaml`.
