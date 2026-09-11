# security-no-weak-jwt-secret

Do not sign or verify JWTs with a literal secret.

- **Preset:** `security-audit` only (`warn`). Deliberately not in `configs.security`.
- **Impact if exploited:** medium
- **Analysis confidence:** high — the finding is a literal in the source with no dataflow to be wrong about.
- **CWE:** [CWE-321: Use of Hard-coded Cryptographic Key](https://cwe.mitre.org/data/definitions/321.html)
- **CAPEC:** [CAPEC-70](https://capec.mitre.org/data/definitions/70.html), [CAPEC-191](https://capec.mitre.org/data/definitions/191.html)
- **OWASP:** [A04:2025 – Cryptographic Failures](https://owasp.org/Top10/2025/A04_2025-Cryptographic_Failures/) · [A02:2021 – Cryptographic Failures](https://owasp.org/Top10/A02_2021-Cryptographic_Failures/) (previous edition)
- **ASVS 5.0:** `v5.0.0-11.2.3` — "Verify that all cryptographic primitives utilize a minimum of 128-bits of security based on the algorithm, key size, and configuration. For example, a 256-bit ECC key provides roughly 128 bits of security where RSA requires a 3072-bit key to achieve 128 bits of security."
- **ASVS 5.0:** `v5.0.0-13.3.1` — "Verify that a secrets management solution, such as a key vault, is used to securely create, store, control access to, and destroy backend secrets. These could include passwords, key material, integrations with databases and third-party systems, keys and seeds for time-based tokens, other internal secrets, and API keys. Secrets must not be included in application source code or included in build artifacts. For an L3 application, this must involve a hardware-backed solution such as an HSM."

## Why it matters

Every holder of the repository can mint valid tokens, and rotation requires a code change. This is the precise half of the secrets family — literal secrets into JWT APIs — never entropy scanning.

## Incorrect

```js
jwt.sign(payload, 's3cr3t')
```

## Correct

```js
jwt.sign(payload, process.env.JWT_SECRET)
```

## Limitations

Stated honestly: Matches jwt-shaped roots only; bare-name sign/verify are out of scope as hopeless generics. Option-property matching is limited to secret/secretOrKey to keep seed files quiet.

## Prior art

Semgrep hardcoded-jwt-secret, CWE-321

## References

- [CWE-321](https://cwe.mitre.org/data/definitions/321.html)
- [OWASP JSON Web Token Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_Cheat_Sheet.html)
- [OWASP Secrets Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
- [RFC 8725](https://www.rfc-editor.org/rfc/rfc8725.html)

Scores, sources and references in `docs/research/rule-inventory.yaml`.
