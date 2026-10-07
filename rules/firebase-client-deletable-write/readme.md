# firebase-client-deletable-write

Disallows a Firebase Realtime Database `.write` that lets any client, or any signed-in client, delete or overwrite a node.

- **CWE:** [CWE-284: Improper Access Control](https://cwe.mitre.org/data/definitions/284.html)
- **OWASP:** [A01:2025 – Broken Access Control](https://owasp.org/Top10/2025/A01_2025-Broken_Access_Control/) · [A01:2021 – Broken Access Control](https://owasp.org/Top10/A01_2021-Broken_Access_Control/) (previous edition)

## Rule details

A delete is a write of `null`, and `.validate` does not run on it. So a
`.write` grants deletes unless it rules them out. The rule reports a `.write`
whose folded value has a disjunct that lets a client in — `true`, or
`auth != null` without `auth.uid` or `auth.token` — and requires neither:

- `newData.exists()`: something is written, so not a delete;
- `!data.exists()`: nothing was there, so nothing is lost.

A `.write` on a parent applies to everything below it, so `auth != null` on a
queue lets any signed-in client empty the queue, whatever its tasks require.
Anonymous sign-in counts as signed in.

Values are folded as in
[firebase-client-writable-trust-path](../firebase-client-writable-trust-path/readme.md).

## Incorrect

```js
module.exports = () => ({ rules: { 'poll-processing': {
  '.write': 'auth != null',
  entries: { $key: { '.write': 'auth != null && newData.exists() && !data.exists()' } },
} } })
```

```js
module.exports = () => ({ rules: { webhookEndpoint: { $taskId: { '.write': true } } } })
```

## Correct

```js
module.exports = () => ({ rules: { 'poll-processing': {
  entries: { $key: { '.write': 'auth != null && newData.exists() && !data.exists()' } },
} } })
```

Grant client writes on the task, create-only, and leave the parent closed.

## Options

- `env`: values for `process.env.X`, as in
  [firebase-client-writable-trust-path](../firebase-client-writable-trust-path/readme.md#options).

## Limitations

- A public webhook endpoint written with `true` is reported even when public
  writes are the point. The delete half is still open; require
  `newData.exists()` on it.
- Single file. A value from a parameter, an import or a member expression is
  skipped.
- The checks are textual, on the folded rule expression.

## References

- [Firebase Realtime Database Security Rules](https://firebase.google.com/docs/database/security)
- [Rules cascade](https://firebase.google.com/docs/database/security/core-syntax#read_and_write_rules_cascade)
