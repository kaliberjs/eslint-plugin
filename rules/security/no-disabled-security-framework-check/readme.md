# security-no-disabled-security-framework-check

Do not disable security framework protections in configuration.

- **Preset:** `security-audit` only (`warn`). Deliberately not in `configs.security`.
- **Impact if exploited:** medium
- **Analysis confidence:** high — the finding is a literal in the source with no dataflow to be wrong about.
- **CWE:** [CWE-1188: Initialization of a Resource with an Insecure Default](https://cwe.mitre.org/data/definitions/1188.html)
- **OWASP:** **not mapped** in the 2025 edition — see `docs/research/owasp-coverage.md` · [A05:2021 – Security Misconfiguration](https://owasp.org/Top10/A05_2021-Security_Misconfiguration/) (previous edition)

## Why it matters

helmet features and Electron webPreferences exist because the attacks they stop are common; switching them off silently re-opens the hole for every request or window.

## Incorrect

```js
app.use(helmet({ contentSecurityPolicy: false }))
```

## Correct

```js
app.use(helmet({ contentSecurityPolicy: { directives: {...} } }))
```

## Limitations

Stated honestly: Covers helmet disable flags and Electron webPreferences shapes; AngularJS $sce, graphql playground and debug flags are known misses for now.

## Prior art

CodeQL js/insecure-helmet-configuration, SonarJS S5739

## References

- [CWE-1188](https://cwe.mitre.org/data/definitions/1188.html)
- [OWASP Nodejs Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Nodejs_Security_Cheat_Sheet.html)
- [OWASP HTML5 Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html)
- [OWASP](https://owasp.org/API-Security/editions/2023/en/0xa8-security-misconfiguration/)

Scores, sources and references in `docs/research/rule-inventory.yaml`.
