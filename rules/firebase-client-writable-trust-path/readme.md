# firebase-client-writable-trust-path

Disallows a Firebase `.write` that any signed-in client passes, under a path or beside a field
whose name claims trust. [CWE-863](https://cwe.mitre.org/data/definitions/863.html) ·
[OWASP A01:2025](https://owasp.org/Top10/2025/A01_2025-Broken_Access_Control/)

## Rule details

Reports a `.write` when both hold:

- its value has a disjunct that is `true`, or `auth != null` without `auth.uid` or `auth.token`;
- a path segment or sibling field contains one of the `words`. Names split on
  camelCase and punctuation, so `verified` matches `verified-queue` and `employee` matches
  `isEmployee`.

A worker that reads such a node as "already verified" acts on whatever a signed-in client wrote.

Rules files are JavaScript, so values are folded first: constants, templates, conditionals and
same-file helpers that return one expression. `process.env` is unset, so a
`CONFIG_ENV === 'dev'` branch folds to production. Anything else is skipped.

```js
// ✗
'verified-queue': { $key: { '.write': 'auth != null && newData.exists() && !data.exists()' } }

// ✓
'verified-queue': { $key: { '.write': 'auth.token.service === true' } }
```

When the file defines a server check (a `const` for `auth.uid === 'serve'`, `isSite` by
convention), an editor suggestion replaces the `.write` with it. It's a suggestion, not a fix:
whether the server is the one that writes here lives in the site code.

## Options

- `words`: lowercase whole words that claim trust. Defaults to `['verified', 'employee']`, the
  words Kaliber's rules files use for claims a worker trusts (`verified-queue`, `isEmployee`). A
  project replaces them with its own list:

```js
'@kaliber/firebase-client-writable-trust-path': ['warn', { words: ['verified', 'approved'] }]
```

## Limitations

- Single file: values from parameters, imports and member expressions are skipped.
- Words match whole words only; `employee` doesn't match `employees`.
- It can't see whether anything trusts the node, only that its name claims trust.
