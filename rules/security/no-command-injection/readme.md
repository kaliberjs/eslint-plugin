# security-no-command-injection

Detects untrusted input flowing into a shell command string.

- **Preset:** `security` (`warn`) and `security-audit` (`warn`)
- **Impact if exploited:** high
- **Analysis confidence:** computed per flow and reported in the message — the analysis is sure the value reaches the sink, less sure how far it travelled. Findings below the floor in `machinery/security/finding.js` are not reported at all.
- **CWE:** [CWE-78: Improper Neutralization of Special Elements used in an OS Command ('OS Command Injection')](https://cwe.mitre.org/data/definitions/78.html)
- **CAPEC:** [CAPEC-88](https://capec.mitre.org/data/definitions/88.html), [CAPEC-6](https://capec.mitre.org/data/definitions/6.html), [CAPEC-15](https://capec.mitre.org/data/definitions/15.html)
- **OWASP:** [A05:2025 – Injection](https://owasp.org/Top10/2025/A05_2025-Injection/) · [A03:2021 – Injection](https://owasp.org/Top10/A03_2021-Injection/) (previous edition)
- **ASVS 5.0:** `v5.0.0-1.2.5` — "Verify that the application protects against OS command injection and that operating system calls use parameterized OS queries or use contextual command line output encoding."

## What it detects

A flow from a registered untrusted **source** to a shell-executing **sink**:

```
req.query.dir  ->  dir  ->  `tar czf backup.tgz ${dir}`  ->  exec()
   source         alias         string building                sink
```

Sinks (in `machinery/security/registry.js`):

- `child_process.exec` / `execSync` — destructured, imported, or reached
  through an aliased namespace (`cp.exec`). The command string goes to
  `/bin/sh`, so `;`, `&&`, backticks and `$()` in any tainted segment execute.
- `shelljs` `exec()`, same semantics.

The rule is a thin consumer of the shared taint analysis, exactly like
[`security-no-sql-injection`](../no-sql-injection/readme.md). Supporting the
module-rooted sink forms required extending `taint.js` with import tracking;
that machinery is shared with every future module-rooted sink family.

## Why this rule exists in this shape

The naive version (`detect-child-process`) flags every use of child_process
and is widely muted. This rule stays silent on everything in its
false-positive corpus (`false-positive.test.js`): config-driven paths,
CLI arguments (deliberately below the reporting floor), allowlist-proven
command choices via membership tests, numbers, and the safe argv-array APIs.

## Incorrect

```js
const { exec } = require('child_process')

function handler(req, res) {
  exec(`convert ${req.query.file} out.png`)     // ; rm -rf / works here
}
```

## Correct

```js
const { execFile } = require('child_process')

function handler(req, res) {
  execFile('convert', [req.query.file, 'out.png'])   // no shell, ever
}
```

Restructuring to an argv array is the fix — there is no escaping scheme for a
shell string that we would be willing to certify as a sanitizer, so the
registry deliberately registers none.

## Configuration level
confidence whenever template interpolation or parameter-name source matching
is involved, and per the severity matrix that does not reach error.

## Limitations

Stated honestly:

- **Argument injection (CWE-88) is not covered.** `execFile('git', ['push',
  req.query.ref])` passes no shell, but attacker-chosen *flags* are still
  dangerous. Different weakness, different rule.
- The tainted value arriving through a helper in another module is invisible —
  the analysis is intra-file (see the SSRF deferral rationale in
  `docs/research/rule-inventory.yaml`).
- Second-order injection (value persisted to a database or file, read back,
  executed) is invisible for the same reason.
- `zx`'s `$` tagged template is not modelled; the taint layer bails on
  unrecognised tags rather than guessing wrong.
- Build scripts and CLIs interpolating developer-supplied values will still
  be flagged when those values come from request-shaped sources; disable on
  the line with a comment if the value is genuinely operator-controlled.

## Prior art

CodeQL `js/command-line-injection`, Semgrep `detect-child-process`,
SonarJS S2076.

## References

- [Node.js child_process docs](https://nodejs.org/api/child_process.html)
- [OWASP OS Command Injection Defense Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/OS_Command_Injection_Defense_Cheat_Sheet.html)
