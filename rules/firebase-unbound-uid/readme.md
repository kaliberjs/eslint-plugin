# firebase-unbound-uid

Disallows a uid field beside a Firebase `.write` any signed-in client passes, when nothing checks
it against `auth.uid`. [CWE-639](https://cwe.mitre.org/data/definitions/639.html) ·
[OWASP A01:2025](https://owasp.org/Top10/2025/A01_2025-Broken_Access_Control/)

## Rule details

Reports a field named after Firebase's `auth.uid` (`uid`, or ending in `Uid` like `userUid`)
whose validation never binds it to `auth.uid` (`newData.val() === auth.uid`), beside a `.write`
any signed-in client passes. The client can then write a task in another user's name, and the
worker that reads it acts for that user.

```js
// ✗
queue: { $key: {
  '.write': 'auth != null && newData.exists() && !data.exists()',
  uid: { '.validate': 'newData.isString()' },
} }

// ✓
queue: { $key: {
  '.write': 'auth != null && newData.exists() && !data.exists()',
  uid: { '.validate': 'newData.val() === auth.uid || newData.val() === data.val()' },
} }
```

An editor suggestion, not an automatic fix, replaces the field's rule with
`newData.val() === auth.uid || newData.val() === data.val()`: it changes what the field accepts.

The second part matters. `@kaliber/firebase-queue` claims a task by rewriting the whole task in a
transaction, and Firebase validates every field of it again, `uid` included, with the worker's
`auth.uid`. With `newData.val() === auth.uid` alone, the worker is denied on every task and the
queue stops; letting an unchanged value through keeps the worker working and still stops a client
from setting someone else's uid.

## Limitations

- Only `uid` names count; `userId` or `applicantId` aren't checked.
- A validation that can't be folded, such as an imported helper, is skipped.
- It can't see whether the worker uses the uid.
