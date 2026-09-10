# security-no-weak-key-size

Do not generate asymmetric keys below the recommended size.

- **Preset:** `security` (`warn`) and `security-audit` (`warn`)
- **Impact if exploited:** medium
- **Analysis confidence:** high — the finding is a literal in the source with no dataflow to be wrong about.
- **CWE:** [CWE-326: Inadequate Encryption Strength](https://cwe.mitre.org/data/definitions/326.html)
- **CAPEC:** [CAPEC-112](https://capec.mitre.org/data/definitions/112.html), [CAPEC-192](https://capec.mitre.org/data/definitions/192.html), [CAPEC-20](https://capec.mitre.org/data/definitions/20.html)
- **OWASP:** [A04:2025 – Cryptographic Failures](https://owasp.org/Top10/2025/A04_2025-Cryptographic_Failures/) · [A02:2021 – Cryptographic Failures](https://owasp.org/Top10/A02_2021-Cryptographic_Failures/) (previous edition)
- **ASVS 5.0:** `v5.0.0-11.2.3` — "Verify that all cryptographic primitives utilize a minimum of 128-bits of security based on the algorithm, key size, and configuration. For example, a 256-bit ECC key provides roughly 128 bits of security where RSA requires a 3072-bit key to achieve 128 bits of security."
- **ASVS 5.0:** `v5.0.0-11.6.2` — "Verify that approved cryptographic algorithms are used for key exchange (such as Diffie-Hellman) with a focus on ensuring that key exchange mechanisms use secure parameters. This will prevent attacks on the key establishment process which could lead to adversary-in-the-middle attacks or cryptographic breaks."

## What it detects

`node:crypto` key generation where the size is written at the call site and
is below the NIST SP 800-57 floor.

- `generateKeyPair` / `generateKeyPairSync` with type `rsa`, `rsa-pss` or
  `dsa` and `modulusLength` below **2048**.
- `generateKeyPair` / `generateKeyPairSync` with type `ec` and a
  `namedCurve` below **224** bits.
- `createDiffieHellman(primeLength)` with a numeric prime length below
  **2048**.

`ed25519`, `x25519`, `ed448` and `x448` take no size parameter — there is
nothing to get wrong, so they are never reported.

```js
crypto.generateKeyPairSync('rsa', { modulusLength: 1024 })
crypto.generateKeyPairSync('dsa', { modulusLength: 1024, divisorLength: 160 })
crypto.generateKeyPairSync('ec', { namedCurve: 'secp160k1' })
crypto.createDiffieHellman(1024)
```

RSA-768 was factored in 2009 and RSA-829 in 2020; NIST SP 800-57 Part 1
Rev. 5 retired everything below 2048-bit RSA/DSA/DH and 224-bit ECC at the
end of 2013. 1024-bit Diffie-Hellman is worse than its size suggests: Logjam
showed the per-group precomputation is within reach of a well-funded
attacker, after which individual sessions are cheap.

## Correct

```js
crypto.generateKeyPairSync('rsa', { modulusLength: 3072 })   // 2048 is the floor, 3072 for a key generated today
crypto.generateKeyPairSync('ec', { namedCurve: 'prime256v1' })
crypto.generateKeyPairSync('ed25519')                        // no size to choose
crypto.createDiffieHellman(2048)                             // or crypto.createECDH('prime256v1')
```

## Why medium severity and high confidence

Severity is medium because exploiting a 1024-bit RSA key is a resourced,
offline attack rather than a request anyone can send — real, but not the
same class as a live injection. Confidence is high (1.0) and the message is
not hedged, unlike the taint-based rules: when the rule fires it has read an
actual number or curve name out of the source. There is no flow to be wrong
about, no interprocedural guess, no "may be" — the comparison is `1024 <
2048`. This matches the inventory's `false_positive_risk: 1` and
`confidence: 5` scoring for a `STATICALLY_DETECTABLE` rule.

## Matching scope and provenance

`generateKeyPair` is an ordinary method name — a KMS client, a wallet
library and a test double can all have one — so the callee must be provably
`node:crypto` before anything is reported. This mirrors
no-jwt-algorithm-confusion's `isFromJwtModule`:

- `import crypto from 'crypto'` / `'node:crypto'`, including renamed
  defaults and renamed named imports (`import { generateKeyPairSync as gen }`).
- `const crypto = require('crypto')`, `const { generateKeyPairSync } =
  require('node:crypto')`, including a renamed destructure
  (`{ generateKeyPairSync: gen }`) — matched on the *imported* name, not the
  local one.
- `require('crypto').generateKeyPairSync(...)`.
- A receiver literally named `crypto` with no binding in the file. The
  webcrypto global has no `generateKeyPair` (it has `crypto.subtle.generateKey`),
  so this is `node:crypto` by elimination. A local named `crypto` that
  resolves to something else does *not* match.

Sizes are read with `getStaticValue`, the same as no-des-3des reads its
algorithm string: a literal, a `const`, folded arithmetic and a static
template all resolve; anything requiring runtime state does not.

Curve size is read from the curve name, where every name in OpenSSL's list
carries its field size as the only three-digit run (`secp112r1`,
`sect163k1`, `prime256v1`, `P-521`, `brainpoolP384r1`). A non-standard curve
of adequate size — `secp256k1`, `brainpoolP256r1` — is **not** reported.
CWE-326 is inadequate *strength*; flagging a 256-bit curve for not being on
a shortlist would be a rule about fashion, and would fire on the entire
Ethereum/Bitcoin ecosystem.

## Known gaps

Deliberate, and not worked around:

- **Third-party key generation is out of scope.** `node-forge`
  (`forge.pki.rsa.generateKeyPair({ bits: 1024 })`, which also has a
  positional `generateKeyPair(bits, e, cb)` form) and `node-rsa`
  (`new NodeRSA({ b: 512 })`) each need their own callee shape *and* their
  own argument shape, and `node-rsa`'s is a constructor with a one-letter
  option key. That is a second matcher with its own false-positive surface
  for libraries neither of which appears in this codebase. Same call as
  no-ssrf made for puppeteer/playwright and `http-proxy-middleware`:
  documented rather than half-implemented. Add them when a project actually
  pulls one in.
- **WebCrypto** (`crypto.subtle.generateKey({ name: 'RSA-OAEP',
  modulusLength: 1024, ... })`) is not matched either, for the same reason —
  a distinct callee and option shape, not yet needed.
- **Non-literal sizes.** `{ modulusLength: config.keySize }` or
  `Number(process.env.RSA_BITS)` cannot be evaluated and are not reported.
  This is the inventory's own documented false negative and the posture of
  every matcher rule here.
- **Indirection.** An options object held in a variable
  (`const options = { modulusLength: 1024 }`) and a same-file helper
  wrapping the call are both misses. Matcher-shaped rules in this codebase
  read the direct call site; the taint engine exists for flows, and a key
  size is not a flow.
- **Keys generated outside the codebase** — by `openssl genrsa`, a
  provisioning script or a vendor — are invisible to a linter.

## Deliberately *not* a gap

A small key in a test fixture, or for interop with a constrained device, is
reported exactly like any other. "Is this file a test" and "did the author
mean it" are not statically knowable, and a rule that guesses at intent
loses trust in both directions. The finding states a fact; if the small key
is deliberate, disable the rule on that line with a comment saying why.

## Prior art

CodeQL `js/insufficient-key-size`, SonarJS S4426 ("Cryptographic keys should
be robust").

## References

- [NIST SP 800-57 Part 1 Rev. 5 — Recommendation for Key Management](https://csrc.nist.gov/pubs/sp/800/57/pt1/r5/final) (§5.6.1, key-length equivalences)
- [CWE-326: Inadequate Encryption Strength](https://cwe.mitre.org/data/definitions/326.html)
- [OWASP Cryptographic Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html)
- [Node.js crypto docs — generateKeyPair](https://nodejs.org/api/crypto.html#cryptogeneratekeypairtype-options-callback)
- [Weak Diffie-Hellman and the Logjam attack](https://weakdh.org/)

Scores, sources and references in `docs/research/rule-inventory.yaml`.
