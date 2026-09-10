# security-no-shell-true

Do not pass `shell: true` to `spawn`, `spawnSync`, `execFile`,
`execFileSync` or `execa`.

- **Preset:** `security-audit` only (`warn`). Deliberately not in `configs.security`.
- **Impact if exploited:** medium
- **Analysis confidence:** high — the finding is a literal in the source with no dataflow to be wrong about.
- **CWE:** [CWE-78: Improper Neutralization of Special Elements used in an OS Command ('OS Command Injection')](https://cwe.mitre.org/data/definitions/78.html)
- **CAPEC:** [CAPEC-88](https://capec.mitre.org/data/definitions/88.html), [CAPEC-6](https://capec.mitre.org/data/definitions/6.html)
- **OWASP:** [A05:2025 – Injection](https://owasp.org/Top10/2025/A05_2025-Injection/) · [A03:2021 – Injection](https://owasp.org/Top10/A03_2021-Injection/) (previous edition)
- **ASVS 5.0:** `v5.0.0-1.2.5` — "Verify that the application protects against OS command injection and that operating system calls use parameterized OS queries or use contextual command line output encoding."

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

Scores, sources and references in `docs/research/rule-inventory.yaml`.
