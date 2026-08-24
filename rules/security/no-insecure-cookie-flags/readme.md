# security-no-insecure-cookie-flags

Session cookies must be Secure, HttpOnly, not SameSite=None without Secure.

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

Warn level in `configs.security`; see docs/research/rule-inventory.yaml for scores, sources and references.
