# security-no-inner-html

Do not assign non-literal values to HTML-parser entry points.

- **OWASP:** [A03:2021 – Injection](https://owasp.org/Top10/A03_2021-Injection/)
- **CWE:** [CWE-79: Cross-site Scripting (XSS)](https://cwe.mitre.org/data/definitions/79.html)
- **Severity:** medium · **Confidence:** high

## What it detects

Any non-literal value reaching a DOM API that invokes the HTML parser:

```js
el.innerHTML = markup            // also outerHTML
el.insertAdjacentHTML('beforeend', markup)
document.write(markup)           // also writeln, incl. window.document
```

Constants of every shape stay quiet: string literals, no-substitution
templates, and pure-literal concatenation — anything that folds to a static
value at parse time cannot carry a payload. This is the DOM counterpart of
[`security-no-dangerously-set-inner-html`](../no-dangerously-set-inner-html/readme.md)
and shares its design decision: unlike `eslint-plugin-no-unsanitized`, the
constant-only form is exempt, because flagging icon sprites teaches teams to
disable the rule.

## Why not just taint?

This rule deliberately does **not** require a tracked source. CMS content,
third-party embeds and server-rendered fragments are unsanitized-by-origin in
a way static analysis often cannot see (the value crosses module or process
boundaries). [`security-no-dom-xss-sink`](../no-dom-xss-sink/readme.md) is
the precise companion: same sinks, but only fires when untrusted input is
actually flowing, with the flow path in the message. The two are kept as
separate rules so their different false-positive profiles can be configured
independently; expect both to fire on a genuine source-to-sink flow.

## Incorrect / Correct

```js
el.innerHTML = cmsField              // flagged
el.textContent = cmsField            // correct for text
el.innerHTML = '<b>' + label + '</b>'  // flagged when label is dynamic
```

## Limitations

Stated honestly:

- Values that merely *passed through* a sanitizer are still flagged until
  sanitizer modelling ships in the taint layer (same status as
  no-dangerously-set-inner-html).
- `document.write` matching is receiver-constrained (`document`, `doc`,
  `*.document`) — an aliased reference under another name is missed.
- Only `=` assignments are checked; compound operators make no sense for HTML
  strings and would be dead matches.

## Prior art

`eslint-plugin-no-unsanitized/property` (does this well; our value is the
shared severity/confidence model), SonarJS S5247.

## References

- [OWASP XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [MDN: Element.innerHTML](https://developer.mozilla.org/en-US/docs/Web/API/Element/innerHTML)
