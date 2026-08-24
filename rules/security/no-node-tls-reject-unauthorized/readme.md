# security-no-node-tls-reject-unauthorized

Disallows setting `NODE_TLS_REJECT_UNAUTHORIZED` to a disabling value.

- **OWASP:** [A02:2021 – Cryptographic Failures](https://owasp.org/Top10/A02_2021-Cryptographic_Failures/), [API8:2023 – Security Misconfiguration](https://owasp.org/API-Security/editions/2023/en/0xa8-security-misconfiguration/)
- **CWE:** [CWE-295: Improper Certificate Validation](https://cwe.mitre.org/data/definitions/295.html)
- **CAPEC:** [CAPEC-459](https://capec.mitre.org/data/definitions/459.html), [CAPEC-475](https://capec.mitre.org/data/definitions/475.html)
- **Severity:** high · **Confidence:** high

## What it detects

The environment variable `NODE_TLS_REJECT_UNAUTHORIZED` set to `'0'` (or `0`)
disables certificate verification for **every** TLS connection the process
makes — including connections made by dependencies that never knew the flag
exists. Node itself prints a warning when this happens.

```
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = 0
Object.assign(process.env, { NODE_TLS_REJECT_UNAUTHORIZED: '0' })
```

## Why it matters

With verification off, TLS degrades to unauthenticated encryption: any
network-position attacker (hostile Wi-Fi, compromised router, on-path host)
can machine-in-the-middle every outbound connection and read or modify what
passes through. There is no legitimate production use. The variable tends to
be added "temporarily" while debugging a certificate problem and then never
removed.

## Incorrect

```js
// Somewhere in an init script, from a Stack Overflow answer:
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

const https = require('https')
https.get('https://internal-api.example.com/')   // now silently unverified
```

## Correct

Supply the CA that the endpoint actually needs, scoped to that connection:

```js
const agent = new https.Agent({
  ca: fs.readFileSync('certs/internal-ca.pem'),   // trust your CA, not nothing
})

https.get('https://internal-api.example.com/', { agent })
```

Or, process-wide but still verifying against a real chain:

```
NODE_EXTRA_CA_CERTS=/path/to/internal-ca.pem node server.js
```

## Configuration level

This rule reports `error` in the opt-in `configs.security`, not `warn`: it is
a literal assignment with no dataflow, so confidence is high by construction,
and the blast radius is the whole process.

## Limitations

Stated honestly:

- **Most real instances are invisible to ESLint.** The variable is usually
  set in a Dockerfile, CI config, shell profile or process manager. A linter
  only sees JavaScript. This rule catches the code-level instances; grep your
  infrastructure configs separately.
- A value assigned from a variable rather than a literal is not flagged — we
  cannot know what it holds at runtime, and flagging would also fire on the
  legitimate re-enable case.
- Setting the variable to any *other* value re-enables verification, which is
  correct behaviour and not reported.

## Prior art

- CodeQL `js/disabling-certificate-validation`
- SonarJS S4830

## References

- [Node.js docs: NODE_TLS_REJECT_UNAUTHORIZED](https://nodejs.org/api/cli.html#node_tls_reject_unauthorizedvalue)
- [OWASP TLS Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Transport_Layer_Security_Cheat_Sheet.html)
