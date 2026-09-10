# security-no-dom-xss-sink

Detects untrusted input flowing into DOM HTML-parser sinks.

- **Preset:** `security` (`warn`) and `security-audit` (`warn`)
- **Impact if exploited:** high
- **Analysis confidence:** computed per flow and reported in the message — the analysis is sure the value reaches the sink, less sure how far it travelled. Findings below the floor in `machinery/security/finding.js` are not reported at all.
- **CWE:** [CWE-79: Improper Neutralization of Input During Web Page Generation ('Cross-site Scripting')](https://cwe.mitre.org/data/definitions/79.html)
- **CAPEC:** [CAPEC-588](https://capec.mitre.org/data/definitions/588.html)
- **OWASP:** [A05:2025 – Injection](https://owasp.org/Top10/2025/A05_2025-Injection/) · [A03:2021 – Injection](https://owasp.org/Top10/A03_2021-Injection/) (previous edition)
- **ASVS 5.0:** `v5.0.0-1.2.1` — "Verify that output encoding for an HTTP response, HTML document, or XML document is relevant for the context required, such as encoding the relevant characters for HTML elements, HTML attributes, HTML comments, CSS, or HTTP header fields, to avoid changing the message or document structure."
- **ASVS 5.0:** `v5.0.0-1.2.3` — "Verify that output encoding or escaping is used when dynamically building JavaScript content (including JSON), to avoid changing the message or document structure (to avoid JavaScript and JSON injection)."

## What it detects

A flow from a registered untrusted **source** (browser globals:
`location.*`, `document.URL`, `document.referrer`, `window.name`,
`document.cookie`; or HTTP request properties) to a parser sink:

```
location.hash  ->  hash  ->  el.innerHTML = hash
   source          alias         sink
```

Sinks are registered in `machinery/security/registry.js`: `innerHTML` /
`outerHTML` assignment targets, `insertAdjacentHTML`, and
`document.write/writeln`. The registry's property-sink support (matching an
assignment *target* rather than a call argument) was added for this family.

## Relationship to security-no-inner-html

Same sinks, different contract:

| | no-inner-html | this rule |
|---|---|---|
| Fires on | any non-literal value | only tracked source flows |
| Severity | medium | high |
| Message | names the sink | includes the full flow path |

Both fire on a genuine vulnerability — that is intended, not a double
report bug: one documents the risky sink, the other proves the flow. The
research plan describes this rule as the *taint-gated upgrade path*, kept as
a separate rule so the two profiles can be enabled independently.

## Why intra-file matters here

DOM XSS is usually contained in a single component file — read the URL,
write the markup — which is exactly the shape this analysis handles well.
The classic interprocedural blindness that defers SSRF-style rules hurts
much less here.

## Limitations

Stated honestly:

- Sanitizer-awareness (DOMPurify etc.) does not exist yet; a sanitized value
  breaks the flow at the sanitizer's call site today only because unknown
  calls stop propagation — which means a *wrapped* sanitizer looks like a
  miss rather than a pass. Both directions are documented.
- Sources entering through React props, router params or postMessage are not
  registered sources; only direct browser globals and request properties are.
- Values built inside another module and assigned here are invisible.

## Prior art

CodeQL `js/xss`, `eslint-plugin-no-unsanitized` + Semgrep
`react-unsanitized-property` (both pattern-based; ours adds the flow).

## References

- [OWASP XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [DOM-based XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/DOM_based_XSS_Prevention_Cheat_Sheet.html)

Scores, sources and references in `docs/research/rule-inventory.yaml`.
