# firebase-client-writable-trust-path

Disallows a Firebase Realtime Database `.write` that any signed-in client passes, under a path or beside a field whose name claims trust.

- **CWE:** [CWE-863: Incorrect Authorization](https://cwe.mitre.org/data/definitions/863.html)
- **OWASP:** [A01:2025 – Broken Access Control](https://owasp.org/Top10/2025/A01_2025-Broken_Access_Control/) · [A01:2021 – Broken Access Control](https://owasp.org/Top10/A01_2021-Broken_Access_Control/) (previous edition)

## Rule details

A rules file written as JavaScript that builds the rules object. The rule
reports a `.write` when both hold:

- **The value** folds to an expression with a disjunct that is `true`, or
  `auth != null` without `auth.uid` or `auth.token`. Any signed-in client
  passes it.
- **The names:** a path segment or a sibling field has a word from
  `trustWords`: `verified`, `approved`, `trusted`, `admin`, `confirmed`,
  `paid`, `validated`, `internal`, `system`, `employee`. Names are split on
  camelCase and non-alphanumerics, so `verified-queue`, `isAdmin` and
  `isEmployee` match.

A queue a worker reads as "already verified", or a field it reads as "this
user is an employee", is then written by whoever signed in.

The value is folded through ESLint's scope analysis: literals, `const`,
templates, `+`, `===`, `!==`, `&&`, `||`, conditionals, `process.env.X` from
the `env` option, and same-file helpers whose body is one returned expression,
with their arguments bound. The path is the chain of object keys up to the
enclosing function, from below the `rules` key.

## Incorrect

```js
function hasAuth() { return `auth != null` }
function isCreate() { return `newData.exists() && !data.exists()` }

module.exports = () => ({ rules: { services: { mail: { 'verified-queue': { $key: {
  '.write': `(${hasAuth()} && ${isCreate()})`,
} } } } } })
```

## Correct

```js
module.exports = () => ({ rules: { services: { mail: { 'verified-queue': { $key: {
  '.write': 'auth != null && auth.token.service === true',
} } } } } })
```

Require a token claim or `auth.uid`, or write the node from the server only.

## Options

```js
'@kaliber/firebase-client-writable-trust-path': ['warn', {
  env: { CONFIG_ENV: 'prd' },
  words: ['verified', 'admin'],
  reportUnresolved: false,
}]
```

- `env`: values for `process.env.X`. An unset key folds to `undefined`, so
  lint with the environment you deploy.
- `words`: replaces `trustWords`. Lowercase, whole words.
- `reportUnresolved`: report a `.write` the rule could not fold as
  `unresolved`, with the reason (`option`, `import`, `member`, `member call`,
  `other`). Off by default; meant for measuring coverage.

## Limitations

- Single file. A value from a parameter, an import or a member expression is
  skipped, as is a helper with a destructured parameter or more than one
  statement.
- The word list was chosen with the known findings in view; plurals and
  synonyms (`employees`, `staff`) do not match.
- It cannot see whether a worker trusts the node. A hit says the name claims
  trust and any signed-in client can write it, not that the claim is acted on.
- The `auth != null` and `auth.uid` checks are textual, on the folded rule
  expression.

## References

- [Firebase Realtime Database Security Rules](https://firebase.google.com/docs/database/security)
- [Rules conditions: `auth`](https://firebase.google.com/docs/database/security/rules-conditions#authentication)
