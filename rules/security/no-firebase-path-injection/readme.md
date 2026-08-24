# security-no-firebase-path-injection

Detects untrusted input flowing into Firebase Realtime Database / Firestore path arguments.

- **OWASP:** [A01:2021 – Broken Access Control](https://owasp.org/Top10/A01_2021-Broken_Access_Control/)
- **CWE:** [CWE-22: Improper Limitation of a Pathname to a Restricted Directory](https://cwe.mitre.org/data/definitions/22.html)
- **CAPEC:** [CAPEC-126](https://capec.mitre.org/data/definitions/126.html)
- **Severity:** high (medium for `.collection()`) · **Confidence:** varies per finding, reported in the message

## What it detects

Realtime Database and Firestore address data through a `/`-separated
hierarchy — the same shape as a filesystem path, and the same weakness:

```
req.params.userId  ->  userId  ->  `users/${userId}/private`  ->  db.ref(...)
       source          alias              path building            sink
```

Sinks (registry): `db.ref(path)` / `database.ref(path)` (Realtime
Database), `firestore.doc(path)` and `firestore.collection(path)`
(Firestore). Reuses the same `path` taint kind as
[no-path-traversal](../no-path-traversal/readme.md) — `path.basename()`
is exactly as valid a fix here (it strips the same `/` characters) — but
kept as a separate rule: the remediation text differs (there is no
resolve-then-check-base-directory equivalent for a database path, only
allowlisting or a reject-on-slash check), and a project without Firebase
should not need to think about this rule at all.

This matters most on the **admin SDK**. A tainted path there does not
just leave the intended subtree — it bypasses whatever Realtime Database
/ Firestore security rules exist, because the admin SDK is not subject
to them.

## Incorrect

```js
async function getUserSelection({ userId }) {
  return db.ref(`users/${userId}/selection`).get()
}
```

A `userId` of `otherUser/selection` reads a different user's data
entirely, regardless of what your Realtime Database rules say about
`$userId: { ".read": "auth.uid === $userId" }` — the rule is checking the
*resolved* path, and this path resolved to something the rule never
anticipated a caller passing in directly.

## Correct

```js
async function getUserSelection({ userId }) {
  if (!isValidFirebasePath(userId)) throw new Error('invalid userId')
  return db.ref(`users/${userId}/selection`).get()
}
```

Reject any value containing a slash (or any character your key space
doesn't use), or validate against an allowlist of known IDs — the same
proof `no-path-traversal`'s allowlist-guard flow sensitivity already
recognizes for this rule too.

## Limitations

Stated honestly:

- A renamed receiver (`const d = db; d.ref(x)`) is a false negative, the
  same class every method-rooted sink in this registry accepts.
- `.child(path)` chained directly off a `.ref()` call
  (`db.ref('a').child(untrusted)`) is not covered — the receiver there is
  a call expression, not the `db`-shaped identifier this rule's receiver
  matching resolves, and matching it would need loosening the receiver
  constraint in a way that risks collisions with unrelated `.child()`
  APIs.
- A project-local validation helper (`isValidFirebasePath` above) is not
  trusted by name — register it explicitly via
  `settings['@kaliber/security'].registry.sanitizers` with
  `root: { helper: 'isValidFirebasePath' }, clears: ['path']` if you want
  it recognized.

## Prior art

No direct static-analysis prior art for this specific sink family; the
underlying weakness class (CWE-22) is the same one CodeQL's
js/path-injection and Semgrep's path-traversal queries already cover for
filesystem APIs.

## References

- [Firebase Realtime Database Security Rules](https://firebase.google.com/docs/database/security)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
