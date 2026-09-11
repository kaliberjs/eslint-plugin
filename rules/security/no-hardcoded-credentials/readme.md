# security-no-hardcoded-credentials

Do not hardcode credentials in source.

- **Preset:** `security-audit` only (`warn`). Deliberately not in `configs.security`.
- **Impact if exploited:** medium
- **Analysis confidence:** high — the finding is a literal in the source with no dataflow to be wrong about.
- **CWE:** [CWE-259: Use of Hard-coded Password](https://cwe.mitre.org/data/definitions/259.html)
- **CAPEC:** [CAPEC-70](https://capec.mitre.org/data/definitions/70.html), [CAPEC-191](https://capec.mitre.org/data/definitions/191.html)
- **OWASP:** [A07:2025 – Authentication Failures](https://owasp.org/Top10/2025/A07_2025-Authentication_Failures/) · [A07:2021 – Identification and Authentication Failures](https://owasp.org/Top10/A07_2021-Identification_and_Authentication_Failures/) (previous edition)
- **ASVS 5.0:** `v5.0.0-13.3.1` — "Verify that a secrets management solution, such as a key vault, is used to securely create, store, control access to, and destroy backend secrets. These could include passwords, key material, integrations with databases and third-party systems, keys and seeds for time-based tokens, other internal secrets, and API keys. Secrets must not be included in application source code or included in build artifacts. For an L3 application, this must involve a hardware-backed solution such as an HSM."

## Why it matters

Credential-shaped options carrying string literals leak through git history, bundles and build logs. This is the precise half of the secrets family: literal values under credential names plus credentialed connection strings - never entropy scanning.

## Incorrect

```js
createPool({ password: 'hunter2prod' })
```

```js
basicAuth({ users: { admin: 'supersecret' } })
```

## Correct

```js
createPool({ password: process.env.DB_PASSWORD })
```

```js
basicAuth({ users: { admin: config.fields.basicAuth.admin } })
```

## express-basic-auth's users map

`express-basic-auth`'s credential shape is invisible to the key-name check
above: the password sits under an *arbitrary username* key, not a name
this rule's list could ever enumerate. Gated on the call itself —
`basicAuth(...)` or `expressBasicAuth(...)`, the two spellings this was
verified against across every Kaliber project surveyed that depends on
`express-basic-auth` — rather than matching any object shaped like
`{ users: { name: value } }`: a username-to-role map (`{ alice: 'editor' }`)
has the exact same AST shape and is not a credential at all.

## Limitations

Stated honestly: Key-name gated (password/passwd/pwd/pass/secret/apiSecret/clientSecret/privateKey/passphrase); a credential stored under an innocent name is missed by design. Values shorter than four characters stay quiet to keep form defaults silent.

The `express-basic-auth` check is name-gated the same way: a renamed
import (`const auth = require('express-basic-auth')`) is not recognised,
and a `users` object assembled elsewhere and spread in
(`{ users: { ...staticUsers } }`) is not traced back to its definition —
the same limitation the wider credentials family and every taint-based
rule in this plugin already accepts.

## Prior art

SonarJS S2068, CWE-798/259

## References

- [CWE-259](https://cwe.mitre.org/data/definitions/259.html)
- [CWE-798](https://cwe.mitre.org/data/definitions/798.html)
- [OWASP Secrets Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
- [CAPEC-70](https://capec.mitre.org/data/definitions/70.html)

Scores, sources and references in `docs/research/rule-inventory.yaml`.
