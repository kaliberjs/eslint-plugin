# firebase-client-deletable-write

Disallows a Firebase `.write` that lets anyone, or any signed-in client, delete or overwrite a
node. [CWE-284](https://cwe.mitre.org/data/definitions/284.html) ·
[OWASP A01:2025](https://owasp.org/Top10/2025/A01_2025-Broken_Access_Control/)

## Rule details

Reports a `.write` with a disjunct that lets a client in (`true`, or `auth != null` without
`auth.uid` or `auth.token`) and doesn't require `!data.exists()`. That client can replace what
exists: overwrite it, or delete it with a write of `null`, which `.validate` doesn't run on.

A `.write` on a parent covers everything below it, so `auth != null` on a queue lets any
signed-in client empty the queue. Anonymous sign-in counts as signed in.

```js
// ✗
'poll-processing': {
  '.write': 'auth != null',
  entries: { $key: { '.write': 'auth != null && newData.exists() && !data.exists()' } },
}

// ✓
'poll-processing': {
  entries: { $key: { '.write': 'auth != null && newData.exists() && !data.exists()' } },
}
```

An editor suggestion, not an automatic fix, allows creates only by wrapping the rule as
`(…) && !data.exists()`. Right for a queue, wrong where something deletes on purpose (a dashboard
that clears a list), so you choose.

## Limitations

- A public webhook endpoint (`.write: true`) is reported even when public writes are intended;
  require `newData.exists()` to keep the delete closed.
- Single file, as in firebase-client-writable-trust-path.
