# security-no-sensitive-data-in-web-storage

No credential-shaped keys in localStorage/sessionStorage.

- **Preset:** `security-audit` only (`warn`). Deliberately not in `configs.security`.
- **Impact if exploited:** medium
- **Analysis confidence:** medium — the rule can see the call shape but not the fact that decides exploitability.
- **CWE:** [CWE-922: Insecure Storage of Sensitive Information](https://cwe.mitre.org/data/definitions/922.html)
- **OWASP:** **not mapped** in the 2025 edition — see `docs/research/owasp-coverage.md` · [A02:2021 – Cryptographic Failures](https://owasp.org/Top10/A02_2021-Cryptographic_Failures/) (previous edition)
- **ASVS 5.0:** `v5.0.0-14.3.3` — "Verify that data stored in browser storage (such as localStorage, sessionStorage, IndexedDB, or cookies) does not contain sensitive data, with the exception of session tokens."

## Why it matters

Every script on the page reads web storage, so one compromised third-party tag exfiltrates tokens. Key-name gating keeps this quiet: theme state is not a finding.

## Incorrect

```js
localStorage.setItem('accessToken', token)
```

## Correct

```js
httpOnly cookie set server-side
```

## Limitations

Stated honestly: Key matching is name-based (token/auth/jwt/secret/api-key/session patterns) — a credential under an innocent name ('ui_state') is missed by design; flagging every write would kill the rule. Reads are not flagged.

## Prior art

CodeQL cleartext-storage, OWASP HTML5 Security Cheat Sheet

## References

- [CWE-922](https://cwe.mitre.org/data/definitions/922.html)
- [OWASP HTML5 Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html)
- [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)

Scores, sources and references in `docs/research/rule-inventory.yaml`.
