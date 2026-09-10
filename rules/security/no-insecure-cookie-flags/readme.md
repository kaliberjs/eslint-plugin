# security-no-insecure-cookie-flags

Session cookies must be Secure, HttpOnly, not SameSite=None without Secure.

- **Preset:** `security` (`warn`) and `security-audit` (`warn`)
- **Impact if exploited:** medium
- **Analysis confidence:** high — the finding is a literal in the source with no dataflow to be wrong about.
- **CWE:** [CWE-1004: Sensitive Cookie Without 'HttpOnly' Flag](https://cwe.mitre.org/data/definitions/1004.html), [CWE-614: Sensitive Cookie in HTTPS Session Without 'Secure' Attribute](https://cwe.mitre.org/data/definitions/614.html), [CWE-1275: Sensitive Cookie with Improper SameSite Attribute](https://cwe.mitre.org/data/definitions/1275.html)
- **CAPEC:** [CAPEC-62](https://capec.mitre.org/data/definitions/62.html), [CAPEC-102](https://capec.mitre.org/data/definitions/102.html)
- **OWASP:** [A02:2025 – Security Misconfiguration](https://owasp.org/Top10/2025/A02_2025-Security_Misconfiguration/) · [A05:2021 – Security Misconfiguration](https://owasp.org/Top10/A05_2021-Security_Misconfiguration/) (previous edition)
- **ASVS 5.0:** `v5.0.0-3.3.2` — "Verify that each cookie's 'SameSite' attribute value is set according to the purpose of the cookie, to limit exposure to user interface redress attacks and browser-based request forgery attacks, commonly known as cross-site request forgery (CSRF)."
- **ASVS 5.0:** `v5.0.0-3.3.4` — "Verify that if the value of a cookie is not meant to be accessible to client-side scripts (such as a session token), the cookie must have the 'HttpOnly' attribute set and the same value (e. g. session token) must only be transferred to the client via the 'Set-Cookie' header field."

## Why it matters

A session cookie over plaintext or readable by scripts means network observers steal sessions and one XSS exfiltrates them. Fires only on session/auth-shaped names — CSRF tokens and preference cookies are legitimately script-readable, and flagging them was scored as the noise that kills this rule.

## Incorrect

```js
res.cookie('sessionId', id)
```

```js
import * as cookie from 'cookie'
res.setHeader('Set-Cookie', cookie.serialize('sessionId', id))
```

## Correct

```js
res.cookie('sessionId', id, { secure: true, httpOnly: true, sameSite: 'lax' })
```

```js
import * as cookie from 'cookie'
res.setHeader('Set-Cookie', cookie.serialize('sessionId', id, { secure: true, httpOnly: true, sameSite: 'lax' }))
```

Two call shapes are covered, both with the same option object: `res.cookie(...)` (Express) and `cookie.serialize(...)` — proven to come from the standalone `cookie` package rather than trusted by receiver name alone, since `cookie` is generic enough to collide with an unrelated local variable. A real auth flow building the `Set-Cookie` header value directly is at least as common as going through `res.cookie()`.

## Limitations

Stated honestly: express-session and koa/fastify cookie options are known misses for now. secure:false behind NODE_ENV dev guards still flags — disable on the line with a comment. The cookie name must be statically determinable (a literal or a const alias) to match the session/auth name pattern at all; a name threaded through a config object passed in from outside the file is a documented miss, not a guess.

## Prior art

SonarJS S2092/S3330, CodeQL clear-text-cookie

## References

- [CWE-1004](https://cwe.mitre.org/data/definitions/1004.html)
- [CWE-614](https://cwe.mitre.org/data/definitions/614.html)
- [CWE-1275](https://cwe.mitre.org/data/definitions/1275.html)
- [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [OWASP](https://owasp.org/www-community/HttpOnly)
- [OWASP](https://owasp.org/www-community/controls/SecureCookieAttribute)
- [codeql.github.com](https://codeql.github.com/codeql-query-help/javascript/js-samesite-none-cookie/)

Scores, sources and references in `docs/research/rule-inventory.yaml`.
