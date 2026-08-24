# security-no-shell-true

Do not pass `shell: true` to `spawn`, `spawnSync`, `execFile`,
`execFileSync` or `execa`.

- **OWASP:** [A03:2021 – Injection](https://owasp.org/Top10/A03_2021-Injection/)
- **CWE:** [CWE-78: Improper Neutralization of Special Elements used in an OS Command](https://cwe.mitre.org/data/definitions/78.html)
- **Severity:** medium · **Confidence:** high

## What it detects

```js
spawn(command, args, { shell: true })
spawnSync(cmd, args, { shell: '/bin/bash' })
execFile(command, args, env, { shell: true })
await execa(command, args, { shell: true })
```

These APIs exist to run a program *without* a shell. Passing `shell: true`
silently re-introduces the shell: the argv array becomes subject to
metacharacter interpretation again, and a value that looked safe as an array
element is suddenly executable syntax.

## Why medium severity

The option enables injection; whether the command actually handles tainted
input is a dataflow question this rule does not answer (see the planned
taint-based `no-command-injection` for that). The finding documents that the
safe API was switched to the unsafe mode of operation.

## Known deliberate uses

The main legitimate case is Windows compatibility — running `.cmd` shims
requires a shell. It stays flagged. If you need it, disable the rule on that
line with a comment explaining why, so the next reader knows the risk was
seen and accepted.

## Limitations

- `shell` set from a variable or spread options object is not flagged.
- Wrapper libraries that default to shell execution are invisible.

## Prior art

Semgrep `spawn-shell-true`, `dangerous-spawn-shell`.

## References

- [Node.js child_process docs](https://nodejs.org/api/child_process.html)
- [OWASP OS Command Injection Defense Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/OS_Command_Injection_Defense_Cheat_Sheet.html)
