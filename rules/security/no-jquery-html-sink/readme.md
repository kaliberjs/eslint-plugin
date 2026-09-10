# security-no-jquery-html-sink

Do not pass non-literal values to jQuery HTML-parsing methods.

- **Preset:** `security-audit` only (`warn`). Deliberately not in `configs.security`.
- **Impact if exploited:** medium
- **Analysis confidence:** medium — the rule can see the call shape but not the fact that decides exploitability.
- **CWE:** [CWE-79: Improper Neutralization of Input During Web Page Generation ('Cross-site Scripting')](https://cwe.mitre.org/data/definitions/79.html)
- **CAPEC:** [CAPEC-588](https://capec.mitre.org/data/definitions/588.html), [CAPEC-63](https://capec.mitre.org/data/definitions/63.html)
- **OWASP:** [A05:2025 – Injection](https://owasp.org/Top10/2025/A05_2025-Injection/) · [A03:2021 – Injection](https://owasp.org/Top10/A03_2021-Injection/) (previous edition)
- **ASVS 5.0:** `v5.0.0-1.2.1` — "Verify that output encoding for an HTTP response, HTML document, or XML document is relevant for the context required, such as encoding the relevant characters for HTML elements, HTML attributes, HTML comments, CSS, or HTTP header fields, to avoid changing the message or document structure."

## Why it matters

jQuery parses markup in .html()/.append()/.wrap() and friends; a non-literal there is jQuery-era XSS. Bare $(x) is deliberately out of scope because selectors dominate that call shape - flagging it would be noise.

## Incorrect

```js
$('#out').html(userValue)
```

## Correct

```js
$('#out').text(userValue)
```

## Limitations

Stated honestly: Literal-only exemption matches the other DOM rules; computed-but-safe values flag until taint coverage reaches jQuery sinks.

## Prior art

CodeQL js/xss-through-dom, Semgrep jquery-insecure-method

## References

- [CWE-79](https://cwe.mitre.org/data/definitions/79.html)
- [OWASP DOM based XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/DOM_based_XSS_Prevention_Cheat_Sheet.html)

Scores, sources and references in `docs/research/rule-inventory.yaml`.
