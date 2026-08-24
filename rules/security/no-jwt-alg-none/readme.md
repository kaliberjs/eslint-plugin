# security-no-jwt-alg-none

Do not accept or produce JWTs signed with the `none` algorithm.

- **OWASP:** [A02:2021 – Cryptographic Failures](https://owasp.org/Top10/A02_2021-Cryptographic_Failures/), [API2:2023 – Broken Authentication](https://owasp.org/API-Security/editions/2023/en/0xa2-broken-authentication/)
- **CWE:** [CWE-347: Improper Verification of Cryptographic Signature](https://cwe.mitre.org/data/definitions/347.html)
- **Severity:** high · **Confidence:** high

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

Reports `error` in the opt-in `configs.security`: a literal in an options
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
