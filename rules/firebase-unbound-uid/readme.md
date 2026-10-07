# firebase-unbound-uid

Disallows a uid field, beside a Firebase Realtime Database `.write` any signed-in client passes, that is never checked against `auth.uid`.

- **CWE:** [CWE-639: Authorization Bypass Through User-Controlled Key](https://cwe.mitre.org/data/definitions/639.html)
- **OWASP:** [A01:2025 – Broken Access Control](https://owasp.org/Top10/2025/A01_2025-Broken_Access_Control/) · [A01:2021 – Broken Access Control](https://owasp.org/Top10/A01_2021-Broken_Access_Control/) (previous edition)

## Rule details

A record any signed-in client can write, with a field that names its owner:
`uid`, `userUid`, `userId`, `ownerUid` or `ownerId`. The rule reports the field
when its folded validation never mentions `auth.uid`. A `.write` that names
`auth.uid` is not one any signed-in client passes, so it is not checked.

A client can then write a task in another user's name, and a worker that reads
the uid acts for that user: attaches their files, mails their address, records
feedback as theirs.

Values are folded as in
[firebase-client-writable-trust-path](../firebase-client-writable-trust-path/readme.md).

## Incorrect

```js
module.exports = () => ({ rules: { queue: { $key: {
  '.write': 'auth != null && newData.exists() && !data.exists()',
  uid: { '.validate': 'newData.isString()' },
} } } })
```

## Correct

```js
module.exports = () => ({ rules: { queue: { $key: {
  '.write': 'auth != null && newData.exists() && !data.exists()',
  uid: { '.validate': 'newData.val() === auth.uid' },
} } } })
```

## Options

- `env`: values for `process.env.X`, as in
  [firebase-client-writable-trust-path](../firebase-client-writable-trust-path/readme.md#options).

## Limitations

- Field names are a fixed list; `applicantId` or `accountUid` are not checked.
- A validation that does not fold (an imported helper) is skipped.
- The rule does not know whether anything reads the uid. A queue whose worker
  ignores it is reported anyway.
- The checks are textual, on the folded rule expression.

## References

- [Rules conditions: `auth`](https://firebase.google.com/docs/database/security/rules-conditions#authentication)
