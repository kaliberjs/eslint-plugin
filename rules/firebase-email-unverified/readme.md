# firebase-email-unverified

Disallows a Firebase `.read` or `.write` that trusts `auth.token.email` without requiring
`auth.token.email_verified`. [CWE-287](https://cwe.mitre.org/data/definitions/287.html) ·
[OWASP A07:2025](https://owasp.org/Top10/2025/A07_2025-Authentication_Failures/)

## Rule details

`auth.token.email` is the address a sign-in claims;
[`auth.token.email_verified`](https://firebase.google.com/docs/rules/rules-and-auth) says the user
owns it. Google sign-in and email links give verified addresses, but if email/password sign-in is
ever switched on in the Firebase console, anyone can create an account as `x@example.com` and pass
a check on the address alone. The console isn't visible from the code, so the rule requires the
check itself.

Reports a `.read` or `.write` with a `||` branch that reads `auth.token.email` and doesn't require
`auth.token.email_verified` (`=== true`, or as a condition on its own).

```js
// ✗
spots: { '.read': "auth != null && auth.token.email.endsWith('@kaliber.net')" }

// ✓
spots: {
  '.read': "auth.token.email_verified === true && auth.token.email.endsWith('@kaliber.net')",
}
```

## Limitations

- `.validate` rules aren't checked.
- The checks are textual, on each folded `||` branch.
