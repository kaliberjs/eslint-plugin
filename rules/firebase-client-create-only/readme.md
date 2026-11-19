# firebase-client-create-only

Requires a Firebase `.write` that lets any signed-in user in to be create-only.
[CWE-284](https://cwe.mitre.org/data/definitions/284.html) ·
[OWASP A01:2025](https://owasp.org/Top10/2025/A01_2025-Broken_Access_Control/)

## Rule details

Reports a `.write` with a `||` branch that lets a user in without naming them (`true`, or
`auth != null` without `auth.uid` or `auth.token`) and doesn't require both `newData.exists()`
and `!data.exists()`. Without both, that user can change what others wrote, or delete it with a
write of `null`, which `.validate` doesn't run on. `hasAuth()` always comes with `isCreate()`.

A `.write` on a parent covers everything below it, so `auth != null` on a queue lets any
signed-in user empty the queue. Anonymous sign-in counts as signed in.

Rules files are JavaScript, so values are folded first: constants, templates, conditionals and
same-file helpers that return one expression. `process.env` is unset, so a
`CONFIG_ENV === 'dev'` branch folds to production. Anything else is skipped.

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

An editor suggestion, not an automatic fix, makes it create-only by wrapping the rule as
`(…) && newData.exists() && !data.exists()`. Right for a queue, wrong where something deletes on
purpose (a dashboard that clears a list), so you choose.

## Limitations

- A public webhook endpoint (`.write: true`) is reported even when public writes are intended;
  require `newData.exists()` to keep the delete closed.
- Single file: values from parameters, imports and member expressions are skipped.
