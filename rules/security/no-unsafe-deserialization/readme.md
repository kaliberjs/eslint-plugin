# security-no-unsafe-deserialization

Do not unserialize untrusted data.

## Why it matters

node-serialize's unserialize evaluates embedded IIFEs in the payload — a documented RCE (CVE-2017-5941). JSON is always the fix and never flagged.

## Incorrect

```js
unserialize(req.body.state)
```

## Correct

```js
JSON.parse(req.body.state)
```

## Limitations

Stated honestly: Only the unserialize name is matched (unique to node-serialize); js-yaml schema behaviour varies by major version and is deliberately not modelled rather than guessed at.

## Prior art

CodeQL js/unsafe-deserialization, CWE-502

Warn level in `configs.security`; scores, sources and references in docs/research/rule-inventory.yaml.
