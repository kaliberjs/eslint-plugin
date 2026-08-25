# security-no-jwt-algorithm-confusion

Always pin the accepted JWT algorithms when verifying.

- **OWASP:** [A02:2021 – Cryptographic Failures](https://owasp.org/Top10/A02_2021-Cryptographic_Failures/), [API2:2023 – Broken Authentication](https://owasp.org/API-Security/editions/2023/en/0xa2-broken-authentication/)
- **CWE:** [CWE-347: Improper Verification of Cryptographic Signature](https://cwe.mitre.org/data/definitions/347.html)
- **Severity:** high · **Confidence:** medium

## What it detects

`verify()` called **without** an explicit `algorithms` allowlist:

```js
jwt.verify(token, key)                                  // flagged
jwt.verify(token, key, { ignoreExpiration: true })       // options, but no algorithms: flagged
jsonwebtoken.verify(token, publicKey)                    // flagged
jwtVerify(token, secretKey)                              // jose, flagged
verify(token, key)                                       // destructured import, flagged
jwt.verify(token, key, function callback(err, d) {})     // callback-only form: flagged
```

Without a pinned list, the token header chooses the verification algorithm.
With an RSA public key used as an HMAC secret, an attacker signs with HS256
using that public key and the signature verifies — a complete authentication
bypass. Anchored by CVE-2022-23541 and CVE-2022-23540.
[RFC 8725 §3.1](https://www.rfc-editor.org/rfc/rfc8725.html#section-3.1):
never select the algorithm from the token.

## Correct

```js
jwt.verify(token, key, { algorithms: ['RS256'] })   // consistent with the key type
```

## A sharper message for one specific real-world mistake

`jsonwebtoken`'s `verify()` only recognizes the plural `algorithms` (an
array) — `algorithm` (singular) is `sign()`'s option name, and `verify()`
silently ignores it. Confirmed against a real call site that had clear
intent to restrict the algorithm and didn't, because of exactly this typo:

```js
jwt.verify(token, key, { algorithm: ['RS256'] })   // flagged as singularAlgorithmTypo, not missingAlgorithms
```

Named separately from the generic `missingAlgorithms` message because the
mistake is more specific and more actionable than "no allowlist was ever
attempted" — the developer already wrote the restriction, it just never
takes effect. Both keys present together (`{ algorithm: 'RS256', algorithms: ['RS256'] }`)
is not flagged: `algorithms` is what actually works, so the stray key
alone is not a finding.

Whether a given instance of this typo is exploitable still depends on the
library version and the key material in use — `jsonwebtoken` 9.x infers a
safe algorithm allowlist from the actual key type when `algorithms` is
absent, which can mean the missing restriction happens to be moot in
practice. The rule reports either way, at the same medium confidence,
because that inference is not something a linter can see, and the
explicit restriction should not depend on it holding.

## Why medium confidence

The rule cannot see the key type: if the key really is symmetric and the
library defaults are sound, the call may be safe. It also cannot follow a
wrapper helper that adds `algorithms` before delegating — that known false
positive family is documented rather than guessed at. Reports at `warn`.

## Matching scope

Member calls match roots named `jwt*`, `jsonwebtoken`, `jws` or `jose`.
Bare-name calls must be *proven* to come from one of those modules — matching
a bare `verify()` on name alone would flag every custom validator in every
codebase. An options object built elsewhere (`config.jwtOptions`) is still
flagged: the rule cannot confirm it contains an `algorithms` list, and an
unverifiable safety claim is treated as absent.

## Prior art

CodeQL `js/jwt-missing-verification`, SonarJS S5659.

## References

- [OWASP JWT Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_Cheat_Sheet.html)
- [GHSA-hjrf-2m68-5959](https://github.com/advisories/GHSA-hjrf-2m68-5959)
