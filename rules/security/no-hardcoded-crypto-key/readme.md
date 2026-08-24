# security-no-hardcoded-crypto-key

Do not pass literal keys to crypto factories.

## Why it matters

A key in source is not a secret — anyone with the repo decrypts captured ciphertext or forges signatures. Buffer.from('literal') is the same key wearing a coat and is matched through.

## Incorrect

```js
crypto.createCipheriv('aes-256-cbc', '0123...', iv)
```

## Correct

```js
crypto.createCipheriv(alg, loadedKey, iv)
```

## Limitations

Stated honestly: Key-length adequacy (weak-key-size) needs string/value analysis and is tracked in the roadmap Tier 3.

## Prior art

CodeQL js/hardcoded-credentials family, CWE-321

Warn level in `configs.security`; scores, sources and references in docs/research/rule-inventory.yaml.
