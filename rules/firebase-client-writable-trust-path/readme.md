# firebase-client-writable-trust-path

Disallows a Firebase `.write` that any signed-in client passes, under a path or beside a field
whose name claims trust. [CWE-863](https://cwe.mitre.org/data/definitions/863.html) ·
[OWASP A01:2025](https://owasp.org/Top10/2025/A01_2025-Broken_Access_Control/)

## Rule details

Reports a `.write` when both hold:

- its value has a disjunct that is `true`, or `auth != null` without `auth.uid` or `auth.token`;
- a path segment or sibling field contains a trust word: `verified`, `approved`, `trusted`,
  `admin`, `confirmed`, `paid`, `validated`, `internal`, `system`, `employee`. Names split on
  camelCase and punctuation, so `verified-queue` and `isEmployee` match.

A worker that reads such a node as "already verified" acts on whatever a signed-in client wrote.

Rules files are JavaScript, so values are folded first: constants, templates, conditionals,
`process.env`, and same-file helpers that return one expression. Anything else is skipped.

```js
// ✗
'verified-queue': { $key: { '.write': 'auth != null && newData.exists() && !data.exists()' } }

// ✓
'verified-queue': { $key: { '.write': 'auth.token.service === true' } }
```

## Options

- `env`: values for `process.env.X`, e.g. `{ CONFIG_ENV: 'prd' }`. Unset keys fold to `undefined`.
- `words`: replaces the trust words. Lowercase, whole words.
- `reportUnresolved`: also report a `.write` that can't be folded, with the reason.

## Limitations

- Single file: values from parameters, imports and member expressions are skipped.
- The word list is a heuristic; `employees` or `staff` don't match.
- It can't see whether anything trusts the node, only that its name claims trust.
