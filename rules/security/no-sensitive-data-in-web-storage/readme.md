# security-no-sensitive-data-in-web-storage

No credential-shaped keys in localStorage/sessionStorage.

## Why it matters

Every script on the page reads web storage, so one compromised third-party tag exfiltrates tokens. Key-name gating keeps this quiet: theme state is not a finding.

## Incorrect

```js
localStorage.setItem('accessToken', token)
```

## Correct

```js
httpOnly cookie set server-side
```

## Limitations

Stated honestly: Key matching is name-based (token/auth/jwt/secret/api-key/session patterns) — a credential under an innocent name ('ui_state') is missed by design; flagging every write would kill the rule. Reads are not flagged.

## Prior art

CodeQL cleartext-storage, OWASP HTML5 Security Cheat Sheet

Warn level in `configs.security`; see docs/research/rule-inventory.yaml for scores, sources and references.
