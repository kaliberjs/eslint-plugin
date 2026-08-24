# security-no-disabled-tls-verification

Disables of TLS certificate or hostname verification, per connection.

- **OWASP:** [A02:2021 – Cryptographic Failures](https://owasp.org/Top10/A02_2021-Cryptographic_Failures/), [API8:2023 – Security Misconfiguration](https://owasp.org/API-Security/editions/2023/en/0xa8-security-misconfiguration/)
- **CWE:** [CWE-295: Improper Certificate Validation](https://cwe.mitre.org/data/definitions/295.html), [CWE-297: Improper Validation of Certificate with Host Mismatch](https://cwe.mitre.org/data/definitions/297.html)
- **CAPEC:** [CAPEC-459](https://capec.mitre.org/data/definitions/459.html), [CAPEC-475](https://capec.mitre.org/data/definitions/475.html)
- **Severity:** high · **Confidence:** high

## What it detects

The same vulnerability as [`security-no-node-tls-reject-unauthorized`](../no-node-tls-reject-unauthorized/readme.md),
expressed per-request instead of process-wide:

```js
rejectUnauthorized: false          // https.request, https.Agent, tls.connect,
                                   // axios httpsAgent, pg / sequelize / mysql2 `ssl`
strictSSL: false                   // request, request-promise
checkServerIdentity: () => {}      // an override that can never throw
```

The option names are TLS-specific with no other plausible meaning, so the rule
matches them anywhere in an object literal. This is deliberate: options are
often built standalone and spread into the actual request later, and flagging
the definition catches that too.

## Why it matters

`rejectUnauthorized: false` turns TLS into unauthenticated encryption — any
network-position attacker can machine-in-the-middle the connection. The
pattern has a strong tendency to be added "temporarily" against a self-signed
certificate and shipped by accident. An override of `checkServerIdentity`
that never throws accepts *any* hostname, which breaks hostname verification
even when the certificate chain is otherwise checked.

## Incorrect

```js
axios.get(url, { httpsAgent: new https.Agent({ rejectUnauthorized: false }) })

request(url, { strictSSL: false })

tls.connect({ checkServerIdentity: () => {} })
```

## Correct

Trust a CA, not nothing:

```js
const agent = new https.Agent({
  ca: fs.readFileSync('certs/internal-ca.pem'),
})

axios.get(url, { httpsAgent: agent })
```

If the endpoint's certificate is valid but its hostname genuinely differs,
fix the certificate. If you truly need a hostname allowlist, keep the throw:

```js
tls.connect({
  checkServerIdentity(host, cert) {
    if (!ALLOWED_HOSTS.has(host)) throw new Error(`unexpected host ${host}`)
  },
})
```

## Configuration level

This rule reports `error` in the opt-in `configs.security`, not `warn`: the
findings are boolean literals in known option names — no dataflow, no
inference — so confidence is high by construction.

## Limitations

Stated honestly:

- Options objects built from config files, environment variables or spreads
  of computed values are not flagged (`{ rejectUnauthorized: someVar }`) —
  we cannot know what the variable holds.
- A custom agent built inside a dependency is invisible to this rule.
- For `checkServerIdentity`, any function containing a `throw` anywhere in
  its body counts as verifying. We do not model *what* it verifies or whether
  the throw is reachable — the analysis stops there on purpose, because
  guessing would produce wrong findings about code we cannot reason about.
- Talking to a device with a self-signed certificate where pinning a CA is
  genuinely impractical will still be flagged. That is intended: the finding
  documents the risk at exactly the line where someone decided to accept it.

## Prior art

- CodeQL `js/disabling-certificate-validation`
- SonarJS S4830 (certificate verification), S5527 (hostname verification)
- Semgrep `sequelize-tls-disabled-cert-validation`

## References

- [Node.js docs: tls.checkServerIdentity](https://nodejs.org/api/tls.html#tlscheckserveridentityhostname-cert)
- [OWASP TLS Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Transport_Layer_Security_Cheat_Sheet.html)
