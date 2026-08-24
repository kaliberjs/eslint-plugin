# security-no-hardcoded-credentials

Do not hardcode credentials in source.

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

Warn level in `configs.security`; scores, sources and references in docs/research/rule-inventory.yaml.
