# security-no-hardcoded-api-key

Do not embed provider API keys or private keys in source.

## Why it matters

Provider keys have distinctive shapes, so pattern matching here is precise rather than heuristic: AWS key ids, OpenAI-style sk- keys, GitHub tokens, Google AIza keys, Slack tokens, and PEM private-key blocks are unambiguous.

## Incorrect

```js
const KEY = 'AKIAIOSFODNN7EXAMPLE'
```

## Correct

```js
process.env.AWS_KEY
```

## Limitations

Stated honestly: Publishable/designed-public keys (Stripe pk_, anon tokens) are not matched but are also not allowlisted yet - adding them would trade precision for convenience. Keys without a known provider shape belong to no-hardcoded-credentials.

## Prior art

gitleaks/trufflehog patterns subset, SonarJS S6418

Warn level in `configs.security`; scores, sources and references in docs/research/rule-inventory.yaml.
