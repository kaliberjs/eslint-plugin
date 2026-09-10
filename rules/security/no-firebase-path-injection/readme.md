# security-no-firebase-path-injection

Detects untrusted input flowing into Firebase Realtime Database / Firestore path arguments.

- **Preset:** `security` (`warn`) and `security-audit` (`warn`)
- **Impact if exploited:** high
- **Analysis confidence:** computed per flow and reported in the message — the analysis is sure the value reaches the sink, less sure how far it travelled. Findings below the floor in `machinery/security/finding.js` are not reported at all.
- **CWE:** [CWE-22: Improper Limitation of a Pathname to a Restricted Directory ('Path Traversal')](https://cwe.mitre.org/data/definitions/22.html)
- **OWASP:** [A01:2025 – Broken Access Control](https://owasp.org/Top10/2025/A01_2025-Broken_Access_Control/) · [A01:2021 – Broken Access Control](https://owasp.org/Top10/A01_2021-Broken_Access_Control/) (previous edition)
- **ASVS 5.0:** `v5.0.0-5.3.2` — "Verify that when the application creates file paths for file operations, instead of user-submitted filenames, it uses internally generated or trusted data, or if user-submitted filenames or file metadata must be used, strict validation and sanitization must be applied. This is to protect against path traversal, local or remote file inclusion (LFI, RFI), and server-side request forgery (SSRF) attacks."

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

Scores, sources and references in `docs/research/rule-inventory.yaml`.
