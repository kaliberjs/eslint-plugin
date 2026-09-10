# security-no-target-blank-without-noopener

Sever the opener relationship on windows opened with `window.open()`.

- **Preset:** `security-audit` only (`warn`). Deliberately not in `configs.security`.
- **Impact if exploited:** medium
- **Analysis confidence:** high for a features string the rule can read, medium for one it cannot.
- **CWE:** [CWE-1022: Use of Web Link to Untrusted Target with window.opener Access](https://cwe.mitre.org/data/definitions/1022.html)
- **OWASP:** **not mapped** in the 2025 edition — see `docs/research/owasp-coverage.md`

## What it detects

`window.open(url, name, features)` where `features` does not contain
`noopener`. The opened page then holds a `window.opener` handle to this one
and can navigate or script it.

```js
window.open(url)                                  // reported
window.open(url, '_blank')                        // reported
window.open(url, name, 'width=500')               // reported
window.open(url, '_blank', featuresFor(size))     // reported: features unreadable
```

```js
window.open(url, '_blank', 'noopener')            // fine
window.open(url, '_blank', 'noopener,width=500')  // fine
```

`window` is resolved as the actual global. A local binding of that name — a
mock, a JSDOM instance, a parameter — is not it, and `fs.open`, `db.open` and
every other `.open()` are out of scope.

## What it deliberately does *not* report

**`<a target="_blank">` without `rel="noopener"`.** HTML defines this for you.
In *Following hyperlinks* (§ 4.6.5), "get an element's noopener" returns true
when the element's link types do not include `opener` and the target is an
ASCII case-insensitive match for `_blank` — so an anchor gets `noopener`
behaviour unless the author explicitly opts back in with `rel="opener"`
(§ 4.6.8.14 defines the [`noopener` link type](https://html.spec.whatwg.org/multipage/links.html#link-type-noopener)
itself). Every engine ships this.

An earlier version of this rule reported anchors at low severity, arguing
that spelling out `rel="noopener"` "keeps the guarantee against legacy
embeds". That argument has no supported-browser requirement behind it — there
is no browser in this project's support matrix that lacks the implied
behaviour — so it was a lint rule policing a browser default, on the single
most common JSX pattern there is. Dropped. `rel="opener"` is a deliberate
choice and is not a finding either.

## Limitations

- **A features string the rule cannot fold is reported as unknown**, not
  assumed safe and not asserted unsafe: the message asks you to check, and
  confidence is medium. If the string genuinely contains `noopener`, either
  inline it or disable the line with a comment.
- **`window.opener` is not the whole of reverse tabnabbing.** Cross-Origin-
  Opener-Policy is the response-header control for this class, and a linter
  cannot see response headers. ASVS covers that as `v5.0.0-3.4.8`, which this
  rule does not verify — hence no ASVS mapping above.
- **Only `window.open`.** `open(url)` as a bare global, and an alias
  (`const openWindow = window.open`), are misses.
- **False negative by design:** a `window` shadowed by a parameter, in a
  module that really is browser code, is not reported. Provenance is
  preferred over reach here.

## Prior art

- [`react/jsx-no-target-blank`](https://github.com/jsx-eslint/eslint-plugin-react/blob/master/docs/rules/jsx-no-target-blank.md)
  — the anchor half, which this rule no longer duplicates. Note its own
  `allowReferrer` / `warnOnSpreadAttributes` options exist because the anchor
  case is largely obsolete.
- SonarJS **S5148** — same weakness, and also reports anchors.

## References

- [HTML Standard § 4.6.5 — Following hyperlinks (get an element's noopener)](https://html.spec.whatwg.org/multipage/links.html#following-hyperlinks)
- [HTML Standard § 4.6.8.14 — Link type "noopener"](https://html.spec.whatwg.org/multipage/links.html#link-type-noopener)
- [MDN — `Window.open()`, `windowFeatures`](https://developer.mozilla.org/en-US/docs/Web/API/Window/open)

Scores, sources and references also in `docs/research/rule-inventory.yaml`.
