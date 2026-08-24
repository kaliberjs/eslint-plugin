# security-no-static-iv

Do not use a fixed initialization vector.

## Why it matters

Reused IVs make equal plaintexts observable and enable chosen-plaintext attacks; the IV must be fresh per encryption and is sent alongside the ciphertext anyway. crypto.randomBytes(16) per call is the remediation; GCM counter nonces with documented uniqueness are the accepted exception (deliberately not flagged).

## Incorrect

```js
crypto.createCipheriv('aes-256-cbc', key, '0123456789abcdef')
```

## Correct

```js
crypto.createCipheriv('aes-256-cbc', key, crypto.randomBytes(16))
```

## Limitations

Stated honestly: Only static-by-construction values are flagged (literals, Buffer.from/alloc of literals); an IV from config is invisible. Monotonic-counter nonces for GCM will still flag - disable on the line with a comment if that is your documented scheme.

## Prior art

Semgrep node-crypto rules, CWE-329

Warn level in `configs.security`; scores, sources and references in docs/research/rule-inventory.yaml.
