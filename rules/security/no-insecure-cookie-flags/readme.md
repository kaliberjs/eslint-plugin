# security-no-insecure-cookie-flags

Session cookies must be Secure, HttpOnly, not SameSite=None without Secure.

## Why it matters

A session cookie over plaintext or readable by scripts means network observers steal sessions and one XSS exfiltrates them. Fires only on session/auth-shaped names — CSRF tokens and preference cookies are legitimately script-readable, and flagging them was scored as the noise that kills this rule.

## Incorrect

```js
res.cookie('sessionId', id)
```

## Correct

```js
res.cookie('sessionId', id, { secure: true, httpOnly: true, sameSite: 'lax' })
```

## Limitations

Stated honestly: Receiver-constrained to res/response.cookie; express-session and koa/fastify cookie options are known misses for now. secure:false behind NODE_ENV dev guards still flags — disable on the line with a comment.

## Prior art

SonarJS S2092/S3330, CodeQL clear-text-cookie

Warn level in `configs.security`; see docs/research/rule-inventory.yaml for scores, sources and references.
