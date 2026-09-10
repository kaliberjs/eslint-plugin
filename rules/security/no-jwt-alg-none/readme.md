# security-no-jwt-alg-none

Do not accept or produce JWTs signed with the `none` algorithm.

- **Preset:** `security` (`error`) and `security-audit` (`warn`)
- **Impact if exploited:** high
- **Analysis confidence:** high — the finding is a literal in the source with no dataflow to be wrong about.
- **CWE:** [CWE-347: Improper Verification of Cryptographic Signature](https://cwe.mitre.org/data/definitions/347.html)
- **CAPEC:** [CAPEC-475](https://capec.mitre.org/data/definitions/475.html), [CAPEC-463](https://capec.mitre.org/data/definitions/463.html)
- **OWASP:** [A04:2025 – Cryptographic Failures](https://owasp.org/Top10/2025/A04_2025-Cryptographic_Failures/) · [A02:2021 – Cryptographic Failures](https://owasp.org/Top10/A02_2021-Cryptographic_Failures/) (previous edition)
- **ASVS 5.0:** `v5.0.0-9.1.2` — "Verify that only algorithms on an allowlist can be used to create and verify self-contained tokens, for a given context. The allowlist must include the permitted algorithms, ideally only either symmetric or asymmetric algorithms, and must not include the 'None' algorithm. If both symmetric and asymmetric must be supported, additional controls will be needed to prevent key confusion."

## What it detects

An options object containing `algorithm: 'none'` or `'none'` inside
`algorithms: [...]` — passed to `jwt.sign`, `jwt.verify`, jose's SignJWT /
jwtVerify, jwt-simple, or any other consumer of the same option shape.

`alg: none` means unsigned. A verifier that accepts it accepts any token the
attacker writes. [RFC 8725 §3.1](https://www.rfc-editor.org/rfc/rfc8725.html#section-3.1)
requires that verifiers never select the algorithm from the token header.

## Incorrect

```js
jwt.verify(token, key, { algorithms: ['none', 'RS256'] })   // accepts forgeries
```

## Correct

```js
jwt.verify(token, key, { algorithms: ['RS256'] })           // explicit allowlist
```

## Configuration level
object with no dataflow and essentially no false positives outside security
tests that deliberately assert rejection.

## Limitations

- An algorithm list built from a variable or config is not flagged.
- Custom verification code that reads the header algorithm itself is not
  covered — see [`security-no-jwt-decode-without-verify`](../no-jwt-decode-without-verify/readme.md)
  for the decode side.
- Libraries whose *default* accepts any algorithm are a different rule
  (`no-jwt-algorithm-confusion`, planned).

## Prior art

Semgrep `jwt-none-alg`, SonarJS S5659, CodeQL `js/jwt-missing-verification`.

## References

- [RFC 8725: Best Current Practices for JWS](https://www.rfc-editor.org/rfc/rfc8725.html)
- [OWASP JWT Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_Cheat_Sheet.html)

Scores, sources and references in `docs/research/rule-inventory.yaml`.
