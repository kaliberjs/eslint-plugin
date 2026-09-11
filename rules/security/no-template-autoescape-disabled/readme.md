# security-no-template-autoescape-disabled

Do not disable template autoescaping.

- **Preset:** `security-audit` only (`warn`). Deliberately not in `configs.security`.
- **Impact if exploited:** medium
- **Analysis confidence:** medium — the rule can see the call shape but not the fact that decides exploitability.
- **CWE:** [CWE-79: Improper Neutralization of Input During Web Page Generation ('Cross-site Scripting')](https://cwe.mitre.org/data/definitions/79.html), [CWE-116: Improper Encoding or Escaping of Output](https://cwe.mitre.org/data/definitions/116.html)
- **CAPEC:** [CAPEC-63](https://capec.mitre.org/data/definitions/63.html), [CAPEC-592](https://capec.mitre.org/data/definitions/592.html)
- **OWASP:** [A05:2025 – Injection](https://owasp.org/Top10/2025/A05_2025-Injection/) · [A03:2021 – Injection](https://owasp.org/Top10/A03_2021-Injection/) (previous edition)
- **ASVS 5.0:** `v5.0.0-1.1.2` — "Verify that the application performs output encoding and escaping either as a final step before being used by the interpreter for which it is intended or by the interpreter itself."

## Why it matters

One configuration line defeats the escaping every template relies on: a single unsanitized CMS or user field becomes stored XSS across the whole engine. Covers nunjucks autoescape, Handlebars noEscape/SafeString, and Angular DomSanitizer bypass methods.

## Incorrect

```js
nunjucks.configure({ autoescape: false })
```

## Correct

```js
Keep escaping on; sanitize individual trusted values at the render site.
```

## Limitations

Stated honestly: EJS <%- %> and Pug != live inside template strings ESLint does not parse; Vue v-html belongs to framework-specific rule sets. Handlebars root matching is name-based ('Handlebars').

## Prior art

SonarJS S5247 family, CWE-116

## References

- [CWE-79](https://cwe.mitre.org/data/definitions/79.html)
- [OWASP Cross Site Scripting Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [OWASP DOM based XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/DOM_based_XSS_Prevention_Cheat_Sheet.html)

Scores, sources and references in `docs/research/rule-inventory.yaml`.
