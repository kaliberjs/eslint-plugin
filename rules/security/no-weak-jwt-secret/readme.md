# security-no-weak-jwt-secret

Do not sign or verify JWTs with a literal secret.

## Why it matters

Every holder of the repository can mint valid tokens, and rotation requires a code change. This is the precise half of the secrets family — literal secrets into JWT APIs — never entropy scanning.

## Incorrect

```js
jwt.sign(payload, 's3cr3t')
```

## Correct

```js
jwt.sign(payload, process.env.JWT_SECRET)
```

## Limitations

Stated honestly: Matches jwt-shaped roots only; bare-name sign/verify are out of scope as hopeless generics. Option-property matching is limited to secret/secretOrKey to keep seed files quiet.

## Prior art

Semgrep hardcoded-jwt-secret, CWE-321

Warn level in `configs.security`; scores, sources and references in docs/research/rule-inventory.yaml.
