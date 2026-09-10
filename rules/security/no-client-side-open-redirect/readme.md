# security-no-client-side-open-redirect

Detects browser-source input flowing into client-side navigation.

Same weakness as [security-no-open-redirect](../no-open-redirect/readme.md),
different sources and sinks — kept as a separate rule so server and client
adoption can differ. This one runs against browser globals, not `req.*`.

- **Preset:** `security` (`warn`) and `security-audit` (`warn`)
- **Impact if exploited:** high
- **Analysis confidence:** computed per flow and reported in the message — the analysis is sure the value reaches the sink, less sure how far it travelled. Findings below the floor in `machinery/security/finding.js` are not reported at all.
- **CWE:** [CWE-601: URL Redirection to Untrusted Site ('Open Redirect')](https://cwe.mitre.org/data/definitions/601.html)
- **CAPEC:** [CAPEC-178](https://capec.mitre.org/data/definitions/178.html)
- **OWASP:** [A01:2025 – Broken Access Control](https://owasp.org/Top10/2025/A01_2025-Broken_Access_Control/) · [A01:2021 – Broken Access Control](https://owasp.org/Top10/A01_2021-Broken_Access_Control/) (previous edition)
- **ASVS 5.0:** `v5.0.0-3.7.2` — "Verify that the application will only automatically redirect the user to a different hostname or domain (which is not controlled by the application) where the destination appears on an allowlist."

## What it detects

A flow from a browser-controlled source to a client navigation sink:

```
location.search  ->  URLSearchParams(...).get('next')  ->  location.href = ...
      source                    parses / propagates              sink
```

Sources (registry): `location.search` / `.hash` / `.href` (and the
`window.`/`document.`/`self.`/`globalThis.` prefixed spellings),
`document.URL`, `document.documentURI`, `document.referrer`, `window.name`.
A tainted string survives a `new URLSearchParams(x)` / `new URL(x)`
construction and the `.get()` call read off it — the shape behind the
canonical `?next=` / `?returnTo=` redirect parameter.

Sinks (registry): assigning `location.href` or `location`/`window.location`/
`self.location` itself, `location.assign()` / `location.replace()`,
`window.open()`, and router navigation (`router.push`/`replace`,
`history.push`/`replace`, `navigateByUrl`).

## Incorrect

```js
location.href = new URLSearchParams(location.search).get('next')   // https://evil.example.com
```

## Correct

```js
const next = new URLSearchParams(location.search).get('next')
const url = new URL(next, location.origin)
if (url.origin === location.origin) location.href = url.href
```

## Limitations

Stated honestly:

- Function parameters, React props, and context values are **not** sources.
  Taint that enters a component from outside the file it's used in is
  invisible — tracking props would taint most of a component tree and turn
  this into noise. A prop threaded straight from `location.search` two
  components up is a real false negative.
- Only `URLSearchParams` and `URL` are registered constructors that carry
  taint through construction; a custom query-string parser is a wall.
- The receiver allowlists (`location`; `window`/`self`/`top`/`parent`/
  `globalThis`; `router`/`history`) are name-matched, not type information.
  An aliased or renamed receiver (`const nav = router; nav.push(...)`) is a
  false negative; an unrelated object incidentally named `router` with a
  `.push()` method is a (rare) false positive.
- Origin comparison (`new URL(value, origin).origin === trusted`) is not
  modeled as a guard, only literal-collection membership is — a correct
  origin check still reports.

## Prior art

CodeQL js/client-side-unvalidated-url-redirection, Semgrep
react-window-location-href, DOM XSS/open-redirect source-sink tables shared
across CodeQL, Semgrep, and this rule's sibling `security-no-dom-xss-sink`.

## References

- [OWASP Unvalidated Redirects and Forwards Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Unvalidated_Redirects_and_Forwards_Cheat_Sheet.html)

Scores, sources and references in `docs/research/rule-inventory.yaml`.
