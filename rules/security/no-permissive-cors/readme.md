# security-no-permissive-cors

Do not reflect request origins into CORS with credentials enabled.

- **Preset:** `security-audit` only (`warn`). Deliberately not in `configs.security`.
- **Impact if exploited:** medium
- **Analysis confidence:** high — the finding is a literal in the source with no dataflow to be wrong about.
- **CWE:** [CWE-942: Permissive Cross-domain Security Policy with Untrusted Domains](https://cwe.mitre.org/data/definitions/942.html)
- **OWASP:** [A02:2025 – Security Misconfiguration](https://owasp.org/Top10/2025/A02_2025-Security_Misconfiguration/) · [A05:2021 – Security Misconfiguration](https://owasp.org/Top10/A05_2021-Security_Misconfiguration/) (previous edition)
- **ASVS 5.0:** `v5.0.0-3.4.2` — "Verify that the Cross-Origin Resource Sharing (CORS) Access-Control-Allow-Origin header field is a fixed value by the application, or if the Origin HTTP request header field value is used, it is validated against an allowlist of trusted origins. When 'Access-Control-Allow-Origin: *' needs to be used, verify that the response does not include any sensitive information."

## Why it matters

Any website can read authenticated responses from your API as the victim: it sends the victim's browser to your endpoint, you echo its origin back with credentials allowed.

## Incorrect

```js
cors({ origin: true, credentials: true })
```

## Correct

```js
cors({ origin: ['https://app.example.com'] })
```

## Limitations

Stated honestly: Bare cors() and origin '*' on a public API are deliberately not flagged — info-level noise per the research entry. An allowlist regex with an unescaped dot is a known miss (regex allowlists are fragile in both directions).

## Prior art

SonarJS S5122, CodeQL js/cors-misconfiguration-for-credentials, Semgrep cors-misconfiguration

## References

- [CWE-942](https://cwe.mitre.org/data/definitions/942.html)
- [CWE-346](https://cwe.mitre.org/data/definitions/346.html)
- [OWASP HTML5 Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html)

Scores, sources and references in `docs/research/rule-inventory.yaml`.
