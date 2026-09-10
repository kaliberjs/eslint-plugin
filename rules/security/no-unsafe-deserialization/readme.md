# security-no-unsafe-deserialization

Do not unserialize untrusted data.

- **Preset:** `security` (`error`) and `security-audit` (`warn`)
- **Impact if exploited:** high
- **Analysis confidence:** high — the finding is a literal in the source with no dataflow to be wrong about.
- **CWE:** [CWE-502: Deserialization of Untrusted Data](https://cwe.mitre.org/data/definitions/502.html)
- **CAPEC:** [CAPEC-586](https://capec.mitre.org/data/definitions/586.html)
- **OWASP:** [A08:2025 – Software or Data Integrity Failures](https://owasp.org/Top10/2025/A08_2025-Software_or_Data_Integrity_Failures/) · [A08:2021 – Software and Data Integrity Failures](https://owasp.org/Top10/A08_2021-Software_and_Data_Integrity_Failures/) (previous edition)
- **ASVS 5.0:** `v5.0.0-1.5.2` — "Verify that deserialization of untrusted data enforces safe input handling, such as using an allowlist of object types or restricting client-defined object types, to prevent deserialization attacks. Deserialization mechanisms that are explicitly defined as insecure must not be used with untrusted input."

## Why it matters

node-serialize's unserialize evaluates embedded IIFEs in the payload — a documented RCE (CVE-2017-5941). JSON is always the fix and never flagged.

## Incorrect

```js
unserialize(req.body.state)
```

## Correct

```js
JSON.parse(req.body.state)
```

## Limitations

Stated honestly: Only the unserialize name is matched (unique to node-serialize); js-yaml schema behaviour varies by major version and is deliberately not modelled rather than guessed at.

## Prior art

CodeQL js/unsafe-deserialization, CWE-502

## References

- [CWE-502](https://cwe.mitre.org/data/definitions/502.html)
- [OWASP Deserialization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Deserialization_Cheat_Sheet.html)
- [CAPEC-586](https://capec.mitre.org/data/definitions/586.html)
- [codeql.github.com](https://codeql.github.com/codeql-query-help/javascript/js-unsafe-deserialization/)

Scores, sources and references in `docs/research/rule-inventory.yaml`.
