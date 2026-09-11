# security-no-plain-http-url

No cleartext http:// or ws:// requests to non-localhost endpoints.

- **Preset:** `security-audit` only (`warn`). Deliberately not in `configs.security`.
- **Impact if exploited:** medium
- **Analysis confidence:** medium — the rule can see the call shape but not the fact that decides exploitability.
- **CWE:** [CWE-319: Cleartext Transmission of Sensitive Information](https://cwe.mitre.org/data/definitions/319.html)
- **CAPEC:** [CAPEC-102](https://capec.mitre.org/data/definitions/102.html), [CAPEC-117](https://capec.mitre.org/data/definitions/117.html), [CAPEC-65](https://capec.mitre.org/data/definitions/65.html)
- **OWASP:** [A04:2025 – Cryptographic Failures](https://owasp.org/Top10/2025/A04_2025-Cryptographic_Failures/) · [A02:2021 – Cryptographic Failures](https://owasp.org/Top10/A02_2021-Cryptographic_Failures/) (previous edition)
- **ASVS 5.0:** `v5.0.0-12.2.1` — "Verify that TLS is used for all connectivity between a client and external facing, HTTP-based services, and does not fall back to insecure or unencrypted communications."
- **ASVS 5.0:** `v5.0.0-12.3.1` — "Verify that an encrypted protocol such as TLS is used for all inbound and outbound connections to and from the application, including monitoring systems, management tools, remote access and SSH, middleware, databases, mainframes, partner systems, or external APIs. The server must not fall back to insecure or unencrypted protocols."

## Why it matters

Credentials, tokens and response bodies are readable and modifiable by any network observer on the path. Literal URLs only — scheme-from-variable is invisible to us and claiming otherwise would be a lie.

## Incorrect

```js
fetch('http://api.example.com/x')
```

## Correct

```js
fetch('https://api.example.com/x')
```

## Limitations

Stated honestly: localhost/127.0.0.1 is exempt as the development hatch. URLs built at runtime are covered by taint rules (dangerous-url-construction) instead.

## Prior art

SonarJS S5244, Semgrep plain-http

## References

- [CWE-319](https://cwe.mitre.org/data/definitions/319.html)
- [OWASP Transport Layer Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Transport_Layer_Security_Cheat_Sheet.html)
- [OWASP HTML5 Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html)

Scores, sources and references in `docs/research/rule-inventory.yaml`.
