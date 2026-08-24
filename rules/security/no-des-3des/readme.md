# security-no-des-3des

Do not use DES, 3DES, RC4 or other retired ciphers.

- **OWASP:** [A02:2021 – Cryptographic Failures](https://owasp.org/Top10/A02_2021-Cryptographic_Failures/)
- **CWE:** [CWE-327: Use of a Broken or Risky Cryptographic Algorithm](https://cwe.mitre.org/data/definitions/327.html)
- **Severity:** high · **Confidence:** high

## What it detects

- `crypto.createCipheriv` / `createDecipheriv` with a literal algorithm
  string starting with `des`, `des3`, `des-`, `rc2`, `rc4`, `bf-`
  (Blowfish) or `cast5`.
- crypto-js constructor-style calls: `CryptoJS.DES`, `TripleDES`, `RC4`,
  `RC4Drop`, `Rabbit`, `RabbitLegacy`.

DES has a 56-bit key — brute-forceable since 1998. 3DES has a 64-bit block
(Sweet32) and is deprecated by NIST (SP 800-131A). RC4 is broken. Node still
exposes all of them through the algorithm string.

## Incorrect

```js
crypto.createCipheriv('des-ede3-cbc', key, iv)
CryptoJS.TripleDES.encrypt(data, key)
```

## Correct

```js
crypto.createCipheriv('aes-256-gcm', key, iv)
```

## Limitations

- Algorithm from a variable or config is not flagged.
- Cipher selection inside a dependency is invisible.
- Decrypt-only legacy migration paths are flagged too. That is deliberate:
  the finding documents the risk at exactly the line where someone decided
  to keep a retired cipher alive; if interop genuinely mandates it, disable
  the rule on that line with a comment saying why.

## Prior art

CodeQL `js/weak-cryptographic-algorithm`, SonarJS S5547.

## References

- [Node.js crypto docs](https://nodejs.org/api/crypto.html)
- [OWASP Cryptographic Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html)
