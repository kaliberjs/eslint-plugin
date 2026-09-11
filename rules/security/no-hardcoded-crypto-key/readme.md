# security-no-hardcoded-crypto-key

Do not pass literal keys to crypto factories.

- **Preset:** `security-audit` only (`warn`). Deliberately not in `configs.security`.
- **Impact if exploited:** medium
- **Analysis confidence:** high — the finding is a literal in the source with no dataflow to be wrong about.
- **CWE:** [CWE-321: Use of Hard-coded Cryptographic Key](https://cwe.mitre.org/data/definitions/321.html)
- **CAPEC:** [CAPEC-191](https://capec.mitre.org/data/definitions/191.html)
- **OWASP:** [A04:2025 – Cryptographic Failures](https://owasp.org/Top10/2025/A04_2025-Cryptographic_Failures/) · [A02:2021 – Cryptographic Failures](https://owasp.org/Top10/A02_2021-Cryptographic_Failures/) (previous edition)
- **ASVS 5.0:** `v5.0.0-13.3.1` — "Verify that a secrets management solution, such as a key vault, is used to securely create, store, control access to, and destroy backend secrets. These could include passwords, key material, integrations with databases and third-party systems, keys and seeds for time-based tokens, other internal secrets, and API keys. Secrets must not be included in application source code or included in build artifacts. For an L3 application, this must involve a hardware-backed solution such as an HSM."

## Why it matters

A key in source is not a secret — anyone with the repo decrypts captured ciphertext or forges signatures. Buffer.from('literal') is the same key wearing a coat and is matched through.

## Incorrect

```js
crypto.createCipheriv('aes-256-cbc', '0123...', iv)
```

## Correct

```js
crypto.createCipheriv(alg, loadedKey, iv)
```

## Limitations

Stated honestly: Key-length adequacy (weak-key-size) needs string/value analysis and is tracked in the roadmap Tier 3.

## Prior art

CodeQL js/hardcoded-credentials family, CWE-321

## References

- [CWE-321](https://cwe.mitre.org/data/definitions/321.html)
- [OWASP Cryptographic Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html)
- [OWASP Secrets Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)

Scores, sources and references in `docs/research/rule-inventory.yaml`.
