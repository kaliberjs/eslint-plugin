# firebase-shadowed-rule

Disallows a Firebase `.read` or `.write` that narrows what an ancestor already grants.
[CWE-284](https://cwe.mitre.org/data/definitions/284.html) ·
[OWASP A01:2025](https://owasp.org/Top10/2025/A01_2025-Broken_Access_Control/)

## Rule details

`.read` and `.write` [cascade](https://firebase.google.com/docs/database/security/core-syntax):
once an ancestor grants access, nothing below can take it away. Reports a child rule when:

- an ancestor grants `true` and the child doesn't;
- an ancestor grants exactly `auth != null` and the child grants less;
- the child is `false` and an ancestor grants anything at all, Firebase's own
  [example](https://firebase.google.com/docs/database/security/resolve-insecurities).

`.validate` doesn't cascade and isn't checked.

```js
// ✗ anyone reads questionnaires
static: { '.read': true, questionnaires: { '.read': "auth.uid === 'serve'" } }

// ✓
static: { skills: { '.read': true }, questionnaires: { '.read': "auth.uid === 'serve'" } }
```

## Limitations

- Ancestors are followed up to the enclosing function; a subtree built by a helper isn't
  connected to its caller.
- Below a conditional ancestor only a `false` child is reported; a narrower condition may still
  apply when the ancestor's doesn't.
