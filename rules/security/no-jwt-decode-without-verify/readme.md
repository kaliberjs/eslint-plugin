# security-no-jwt-decode-without-verify

Do not trust claims from a decoded-but-unverified JWT.

- **Preset:** `security-audit` only (`warn`). Deliberately not in `configs.security`.
- **Impact if exploited:** high
- **Analysis confidence:** medium — the rule can see the call shape but not the fact that decides exploitability.
- **CWE:** [CWE-347: Improper Verification of Cryptographic Signature](https://cwe.mitre.org/data/definitions/347.html)
- **CAPEC:** [CAPEC-475](https://capec.mitre.org/data/definitions/475.html)
- **OWASP:** [A04:2025 – Cryptographic Failures](https://owasp.org/Top10/2025/A04_2025-Cryptographic_Failures/) · [A07:2021 – Identification and Authentication Failures](https://owasp.org/Top10/A07_2021-Identification_and_Authentication_Failures/) (previous edition)
- **ASVS 5.0:** `v5.0.0-9.1.1` — "Verify that self-contained tokens are validated using their digital signature or MAC to protect against tampering before accepting the token's contents."

## What it detects

Calls that parse a token without checking its signature:

```js
jwt.decode(token)                 // jsonwebtoken
jwtDecode(token)                  // jwt-decode
decodeJwt(token)                  // jose
decodeProtectedHeader(token)      // jose
jsonwebtoken.decode(token)
```

The payload of an unverified token is attacker-authored JSON. Using its
claims for authentication or authorization is an authentication bypass with
a trivial exploit.

## Why medium confidence

The rule cannot see what happens to the claims afterwards. Three legitimate,
frequent uses exist and are still reported on purpose:

1. Reading `exp` client-side to decide when to refresh.
2. Logging or debugging a token's contents.
3. Reading the `kid` header to select a verification key — correct and necessary.

If your use is one of these, the finding is a false positive by design; the
message names all three so a reviewer can confirm quickly. Same-file
"verify was also called" reasoning is future work in the taint layer.

## Correct

```js
const claims = jwt.verify(token, key, { algorithms: ['RS256'] })
// claims is trustworthy; decode() never is
```

## Matching scope

Member calls match only known library roots (`jwt`, `jsonwebtoken`, `jws`,
`jose`) — note `jsonwebtoken` does not contain the substring "jwt", so it is
listed explicitly. Bare-name forms (`jwtDecode`, `decodeJwt`,
`decodeProtectedHeader`) only exist in JWT libraries. Aliased imports bound
to unrelated names are a known miss.

## References

- [OWASP JWT Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_Cheat_Sheet.html)
- [RFC 8725](https://www.rfc-editor.org/rfc/rfc8725.html)

Scores, sources and references in `docs/research/rule-inventory.yaml`.
