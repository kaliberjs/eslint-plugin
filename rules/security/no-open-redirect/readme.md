# security-no-open-redirect

Detects untrusted input flowing into server-side redirects.

- **OWASP:** [A01:2021 – Broken Access Control](https://owasp.org/Top10/A01_2021-Broken_Access_Control/)
- **CWE:** [CWE-601: URL Redirection to Untrusted Site ('Open Redirect')](https://cwe.mitre.org/data/definitions/601.html)
- **CAPEC:** [CAPEC-593](https://capec.mitre.org/data/definitions/593.html)
- **Severity:** high · **Confidence:** varies per finding, reported in the message

## What it detects

A flow from a registered untrusted source to a server-side redirect sink:

```
req.query.next  ->  next  ->  res.redirect(next)
     source        alias          sink
```

Sinks (registry): `res.redirect` / `res.location` (Express, Fastify reply,
Koa `ctx`), `next/navigation`'s server `redirect()`, and the raw
`res.setHeader('Location', x)` form, matched by a literal header name paired
with a tainted value.

Damage is worst right after authentication: a login or OAuth flow that
echoes a `returnTo` / `redirect_uri` parameter without an allowlist sends the
victim, carrying a freshly authenticated session, to an attacker-controlled
origin.

## Incorrect

```js
function handler(req, res) {
  res.redirect(req.query.next)   // //evil.example.com
}
```

## Correct

```js
function handler(req, res) {
  const next = req.query.next
  if (!['/dashboard', '/profile'].includes(next)) return res.redirect('/dashboard')
  res.redirect(next)
}
```

An equality check against a literal allowlist is what the flow-sensitivity
layer can prove safe — `if (!ALLOWED.includes(next)) return` before the
redirect clears the flow for later use of `next` in this function.

## Limitations

Stated honestly:

- A tainted value that reaches the sink through another module is invisible
  except through same-file helper summaries.
- Origin comparison (`new URL(value, base).origin === trusted`) is not
  modeled as a guard; only literal-collection membership is proven, so a
  correct origin check still reports unless the value is also allowlisted.
- The `res`/`response`/`reply`/`ctx` receiver names are a heuristic, not type
  information — a differently named response object is a false negative, and
  an unrelated object incidentally named `res` with a `.redirect()` method is
  a (rare) false positive.

## Prior art

CodeQL js/client-side-unvalidated-url-redirection (server variant), Semgrep
express-open-redirect, eslint-plugin-security detect-non-literal-regexp
family conventions for taint-based rules.

## References

- [OWASP Unvalidated Redirects and Forwards Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Unvalidated_Redirects_and_Forwards_Cheat_Sheet.html)
