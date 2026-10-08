# firebase-client-writable-trust-path

Disallows a Firebase `.write` that any signed-in client passes, under a path or beside a field
whose name claims trust. [CWE-863](https://cwe.mitre.org/data/definitions/863.html) ·
[OWASP A01:2025](https://owasp.org/Top10/2025/A01_2025-Broken_Access_Control/)

## Rule details

Reports a `.write` when both hold:

- its value has a disjunct that is `true`, or `auth != null` without `auth.uid` or `auth.token`;
- a path segment or sibling field contains one of the configured `words`. Names split on
  camelCase and punctuation, so `verified` matches `verified-queue` and `employee` matches
  `isEmployee`.

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

Off in the shared config: which names claim trust is the project's knowledge, so enable it with
the project's own words.

```js
'@kaliber/firebase-client-writable-trust-path': ['warn', { words: ['verified'] }]
```

- `words` (required): lowercase whole words that claim trust in this project.
- `env`: values for `process.env.X`, e.g. `{ CONFIG_ENV: 'prd' }`. Unset keys fold to `undefined`.

## Limitations

- Single file: values from parameters, imports and member expressions are skipped.
- Words match whole words only; `employee` doesn't match `employees`.
- It can't see whether anything trusts the node, only that its name claims trust.
