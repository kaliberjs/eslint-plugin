# security-no-hardcoded-api-key

Do not embed provider API keys or private keys in source.

- **Preset:** `security-audit` only (`warn`). Deliberately not in `configs.security`.
- **Impact if exploited:** medium
- **Analysis confidence:** high — the finding is a literal in the source with no dataflow to be wrong about.
- **CWE:** [CWE-798: Use of Hard-coded Credentials](https://cwe.mitre.org/data/definitions/798.html)
- **CAPEC:** [CAPEC-191](https://capec.mitre.org/data/definitions/191.html), [CAPEC-70](https://capec.mitre.org/data/definitions/70.html)
- **OWASP:** [A07:2025 – Authentication Failures](https://owasp.org/Top10/2025/A07_2025-Authentication_Failures/) · [A07:2021 – Identification and Authentication Failures](https://owasp.org/Top10/A07_2021-Identification_and_Authentication_Failures/) (previous edition)
- **ASVS 5.0:** `v5.0.0-13.3.1` — "Verify that a secrets management solution, such as a key vault, is used to securely create, store, control access to, and destroy backend secrets. These could include passwords, key material, integrations with databases and third-party systems, keys and seeds for time-based tokens, other internal secrets, and API keys. Secrets must not be included in application source code or included in build artifacts. For an L3 application, this must involve a hardware-backed solution such as an HSM."

## Why it matters

Provider keys have distinctive shapes, so pattern matching here is precise rather than heuristic: AWS key ids, OpenAI-style sk- keys, GitHub tokens, Google AIza keys, Slack tokens, and PEM private-key blocks are unambiguous.

## Incorrect

```js
const KEY = 'AKIAIOSFODNN7EXAMPLE'
```

## Correct

```js
process.env.AWS_KEY
```

## Limitations

Stated honestly: Publishable/designed-public keys (Stripe pk_, anon tokens) are not matched but are also not allowlisted yet - adding them would trade precision for convenience. Keys without a known provider shape belong to no-hardcoded-credentials.

## Prior art

gitleaks/trufflehog patterns subset, SonarJS S6418

## References

- [CWE-798](https://cwe.mitre.org/data/definitions/798.html)
- [OWASP Secrets Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)

Scores, sources and references in `docs/research/rule-inventory.yaml`.
