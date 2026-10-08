# firebase-client-deletable-write

Disallows a Firebase `.write` that lets anyone, or any signed-in client, delete or overwrite a
node. [CWE-284](https://cwe.mitre.org/data/definitions/284.html) ·
[OWASP A01:2025](https://owasp.org/Top10/2025/A01_2025-Broken_Access_Control/)

## Rule details

A delete is a write of `null`, and `.validate` doesn't run on it. Reports a `.write` with a
disjunct that lets a client in (`true`, or `auth != null` without `auth.uid` or `auth.token`)
and requires neither `newData.exists()` nor `!data.exists()`.

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

## Options

- `env`: as in
  [firebase-client-writable-trust-path](../firebase-client-writable-trust-path/readme.md#options).

## Limitations

- A public webhook endpoint (`.write: true`) is reported even when public writes are intended;
  require `newData.exists()` to keep the delete closed.
- Single file, as in firebase-client-writable-trust-path.
