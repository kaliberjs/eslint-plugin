# security-no-eval

Untrusted or dynamically-built code reaching the `vm` module.

- **OWASP:** [A03:2021 – Injection](https://owasp.org/Top10/A03_2021-Injection/)
- **CWE:** [CWE-95: Eval Injection](https://cwe.mitre.org/data/definitions/95.html)
- **CAPEC:** [CAPEC-77](https://capec.mitre.org/data/definitions/77.html)
- **Severity:** high when tainted · medium when dynamic · silent when static

## Why this rule exists alongside core `no-eval`

The shared config already enables ESLint core's `no-eval`, `no-implied-eval`
and `no-new-func` — those own `eval()`, string-bodied timers and
`new Function`. This rule is deliberately about what they **do not see**:
the `vm` module's code-compilation entry points:

```js
vm.runInThisContext(code)
vm.runInNewContext(code, sandbox)
vm.runInContext(code, context)
vm.compileFunction(body)
```

All binding shapes are matched: destructured imports, `require('vm')`
members, and aliased namespaces (`import * as vm from 'vm'`).

## The two tiers, per the research plan

| Argument | Result |
|---|---|
| Tracked untrusted source | high severity finding with the flow path |
| Built at runtime from untainted values | medium severity: "one refactor away from user input" |
| Static literal | silent — evaluating a fixed snippet is a tooling pattern |

## Incorrect

```js
const { runInNewContext } = require('vm')

function handler(req) {
  runInNewContext(`process.exit(${req.query.code})`)   // arbitrary code execution
}
```

There is no sanitizer for code. A value that passed through *any* escaping
scheme and then reaches one of these sinks is still a finding by
construction; the registry registers no `code` sanitizers on purpose.

## Correct

Data-driven dispatch instead of building source strings:

```js
const ACTIONS = { cleanup, migrate, report }
const action = ACTIONS[req.query.action] ?? () => {}
action()
```

## Limitations

Stated honestly:

- Values arriving through another module are invisible (intra-file analysis,
  same deferral as SSRF).
- An unknown call wrapping the code argument stops propagation — a miss, not
  a guess.
- Third-party sandbox libraries (safe-eval etc.) are not modelled yet;
  their sink entries would be pure registry data.

## Prior art

CodeQL `js/code-injection`, Semgrep `lang/security/audit/eval`.

## References

- [Node.js vm docs](https://nodejs.org/api/vm.html)
- [OWASP OS Command Injection Defense Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/OS_Command_Injection_Defense_Cheat_Sheet.html) — the argv-array principle applies to code dispatch too
