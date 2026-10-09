# firebase-notes

Marks Firebase keys that change how the other Firebase rules treat everything below them, so the
reason is visible where it applies. Notes, not problems.

## Rule details

- **A trust word** (`verified-queue`, by default `verified` and `employee`) on a key with `.write`
  rules below it: a signed-in user writing there is reported by
  [firebase-client-writable-trust-path](../firebase-client-writable-trust-path/readme.md).
- **A service node** `services/<name>` that holds records (a `$` key) and whose check is defined
  in the file (`isJobAlertSubscriptionService` for
  `auth.uid === 'job-alert-subscription-service'`): its records may get unlisted keys only from
  that service, their data from nobody, as
  [firebase-other-required](../firebase-other-required/readme.md) checks.

## Show as `info`

ESLint has no `info` severity; the shared config sets the rule to `warn`, and the editor shows it
as information (a blue underline) through the ESLint language server:

```jsonc
// VS Code, settings.json
"eslint.rules.customizations": [{ "rule": "@kaliber/firebase-notes", "severity": "info" }]

// Zed, settings.json
"lsp": { "eslint": { "settings": {
  "rulesCustomizations": [{ "rule": "@kaliber/firebase-notes", "severity": "info" }]
} } }
```

In CI the notes show as warnings; turn them off there with
`--rule '@kaliber/firebase-notes: off'`.

## Options

- `words`: the trust words, as in
  [firebase-client-writable-trust-path](../firebase-client-writable-trust-path/readme.md#options).
