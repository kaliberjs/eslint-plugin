# security-no-ecb-mode

Do not use ECB block cipher mode.

- **Preset:** `security-audit` only (`warn`). Deliberately not in `configs.security`.
- **Impact if exploited:** high
- **Analysis confidence:** high for a call resolved to a `node:crypto` import, medium for a bare name match (crypto-js ships as a CDN global with no import to resolve).
- **CWE:** [CWE-327: Use of a Broken or Risky Cryptographic Algorithm](https://cwe.mitre.org/data/definitions/327.html)
- **CAPEC:** [CAPEC-97](https://capec.mitre.org/data/definitions/97.html), [CAPEC-20](https://capec.mitre.org/data/definitions/20.html)
- **OWASP:** [A04:2025 – Cryptographic Failures](https://owasp.org/Top10/2025/A04_2025-Cryptographic_Failures/) · [A02:2021 – Cryptographic Failures](https://owasp.org/Top10/A02_2021-Cryptographic_Failures/) (previous edition)
- **ASVS 5.0:** `v5.0.0-11.3.3` — "Verify that encrypted data is protected against unauthorized modification preferably by using an approved authenticated encryption method or by combining an approved encryption method with an approved MAC algorithm."

## What it detects

- `crypto.createCipheriv` / `createDecipheriv` with an algorithm string
  ending in `-ecb` (`aes-256-ecb`, `AES-128-ECB`, …).
- `crypto.createCipher()` — deprecated entirely: its key derivation is
  MD5-based and its IV is implicit.
- crypto-js: `{ mode: CryptoJS.mode.ECB }`.

ECB encrypts identical plaintext blocks to identical ciphertext blocks. The
classic demonstration is the ECB penguin: an image encrypted with ECB stays
recognizable as an image. Structure leaks, and blocks can be reordered.

## Incorrect

```js
crypto.createCipheriv('aes-256-ecb', key, null)
crypto.createCipher('aes-256-cbc', password)
CryptoJS.AES.encrypt(data, key, { mode: CryptoJS.mode.ECB })
```

## Correct

```js
crypto.createCipheriv('aes-256-gcm', key, iv)   // authenticated encryption
```

CBC with a MAC is a distant second choice; GCM or ChaCha20-Poly1305 first.

## Limitations

- Mode from a variable or config is not flagged.
- Single-block encryption of a fixed-size random value is technically not
  weakened by ECB — flagged anyway; the escape hatch is a rule disable on
  that line with a comment.
- CBC used without integrity checking is a different weakness this rule does
  not cover.

## Prior art

SonarJS S5542, CodeQL `js/weak-cryptographic-algorithm`.

## References

- [Node.js crypto docs](https://nodejs.org/api/crypto.html)
- [OWASP Cryptographic Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html)

Scores, sources and references in `docs/research/rule-inventory.yaml`.
