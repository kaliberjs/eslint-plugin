# security-no-hardcoded-credentials

Do not hardcode credentials in source.

## Why it matters

Credential-shaped options carrying string literals leak through git history, bundles and build logs. This is the precise half of the secrets family: literal values under credential names plus credentialed connection strings - never entropy scanning.

## Incorrect

```js
createPool({ password: 'hunter2prod' })
```

## Correct

```js
createPool({ password: process.env.DB_PASSWORD })
```

## Limitations

Stated honestly: Key-name gated (password/passwd/pwd/pass/secret/apiSecret/clientSecret/privateKey/passphrase); a credential stored under an innocent name is missed by design. Values shorter than four characters stay quiet to keep form defaults silent.

## Prior art

SonarJS S2068, CWE-798/259

Warn level in `configs.security`; scores, sources and references in docs/research/rule-inventory.yaml.
