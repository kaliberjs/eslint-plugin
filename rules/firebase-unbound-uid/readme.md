# firebase-unbound-uid

Disallows a uid field beside a Firebase `.write` any signed-in client passes, when nothing checks
it against `auth.uid`. [CWE-639](https://cwe.mitre.org/data/definitions/639.html) ·
[OWASP A01:2025](https://owasp.org/Top10/2025/A01_2025-Broken_Access_Control/)

## Rule details

Reports a `uid`, `userUid`, `userId`, `ownerUid` or `ownerId` field whose validation never
mentions `auth.uid`, beside a `.write` any signed-in client passes. The client can then write a
task in another user's name, and the worker that reads it acts for that user.

```js
// ✗
queue: { $key: {
  '.write': 'auth != null && newData.exists() && !data.exists()',
  uid: { '.validate': 'newData.isString()' },
} }

// ✓
queue: { $key: {
  '.write': 'auth != null && newData.exists() && !data.exists()',
  uid: { '.validate': 'newData.val() === auth.uid' },
} }
```

## Options

- `env`: as in
  [firebase-client-writable-trust-path](../firebase-client-writable-trust-path/readme.md#options).

## Limitations

- Field names are a fixed list; `applicantId` isn't checked.
- A validation that can't be folded, such as an imported helper, is skipped.
- It can't see whether the worker uses the uid.
