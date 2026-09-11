# security-no-authorization-header-log

Do not log request credentials wholesale.

- **Preset:** `security-audit` only (`warn`). Deliberately not in `configs.security`.
- **Impact if exploited:** medium
- **Analysis confidence:** high — the finding is a literal in the source with no dataflow to be wrong about.
- **CWE:** [CWE-532: Insertion of Sensitive Information into Log File](https://cwe.mitre.org/data/definitions/532.html)
- **CAPEC:** [CAPEC-215](https://capec.mitre.org/data/definitions/215.html)
- **OWASP:** [A09:2025 – Security Logging and Alerting Failures](https://owasp.org/Top10/2025/A09_2025-Security_Logging_and_Alerting_Failures/) · [A09:2021 – Security Logging and Monitoring Failures](https://owasp.org/Top10/A09_2021-Security_Logging_and_Monitoring_Failures/) (previous edition)
- **ASVS 5.0:** `v5.0.0-16.2.5` — "Verify that when logging sensitive data, the application enforces logging based on the data's protection level. For example, it may not be allowed to log certain data, such as credentials or payment details. Other data, such as session tokens, may only be logged by being hashed or masked, either in full or partially."

## What it detects

Credentials reaching something that logs:

```js
console.log(req.headers)                        // every credential the client sent
logger.info(request.headers)
console.log(req.cookies)
console.error(`auth failed`, req.headers.authorization)
console.warn(headers['x-api-key'])
console.log(JSON.stringify(event.headers))      // Lambda-style, wrapped
```

Logged credentials land in log aggregation, where retention is long and read
access is typically far wider than the application itself.

## Matching scope

Logger calls are member calls named `log`, `info`, `warn`, `error`, `debug`,
`trace` or `fatal` — this covers `console.*` and most logger facades without
import analysis.

Flagged expressions:

- `.headers` or `.cookies` on an object rooted at `req`, `request`, `event`
  or `ctx`.
- A sensitive header (`authorization`, `proxy-authorization`, `cookie`,
  `x-api-key`) read off any `headers` object, regardless of root name.
- Any of the above wrapped in calls, template literals or object literals
  passed to the logger — wrapping does not keep credentials out of the log.

## Limitations

Stated honestly:

- Headers spread into a larger object built elsewhere are found only when
  the spread happens inside the logged expression.
- Headers logged by middleware or an APM agent are invisible.
- An outgoing request the application constructed itself has no client
  credentials; roots other than the request-ish names above stay quiet for
  exactly that reason — but a request-like object under a different name
  (`incomingMessage.headers` via a differently-named parameter) is missed.

## Correct

Log a named subset of non-sensitive headers:

```js
console.log({ requestId: req.headers['x-request-id'], userAgent: req.headers['user-agent'] })
```

## References

- [OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)

Scores, sources and references in `docs/research/rule-inventory.yaml`.
