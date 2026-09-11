# security-no-javascript-url

No javascript: URLs in navigation positions.

- **Preset:** `security-audit` only (`warn`). Deliberately not in `configs.security`.
- **Impact if exploited:** medium
- **Analysis confidence:** high — the finding is a literal in the source with no dataflow to be wrong about.
- **CWE:** [CWE-83: Improper Neutralization of Script in Attributes in a Web Page](https://cwe.mitre.org/data/definitions/83.html)
- **CAPEC:** [CAPEC-63](https://capec.mitre.org/data/definitions/63.html), [CAPEC-588](https://capec.mitre.org/data/definitions/588.html)
- **OWASP:** [A05:2025 – Injection](https://owasp.org/Top10/2025/A05_2025-Injection/) · [A03:2021 – Injection](https://owasp.org/Top10/A03_2021-Injection/) (previous edition)
- **ASVS 5.0:** `v5.0.0-1.2.2` — "Verify that when dynamically building URLs, untrusted data is encoded according to its context (e.g., URL encoding or base64url encoding for query or path parameters). Ensure that only safe URL protocols are permitted (e.g., disallow javascript: or data:)."

## Why it matters

The URL body executes as script when the link or frame activates — XSS without any injection elsewhere. Literal-only slice; computed values belong to the DOM-XSS registry once grown.

## Incorrect

```js
<a href='javascript:void(0)'>
```

## Correct

```js
button + event handler
```

## Limitations

Stated honestly: Computed href values (router params etc.) are a documented miss until the taint layer covers URL sinks.

## Prior art

eslint-plugin-security safe-lookup, SonarJS S5247 sibling family

## References

- [CWE-83](https://cwe.mitre.org/data/definitions/83.html)
- [OWASP DOM based XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/DOM_based_XSS_Prevention_Cheat_Sheet.html)
- [OWASP Cross Site Scripting Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)

Scores, sources and references in `docs/research/rule-inventory.yaml`.
