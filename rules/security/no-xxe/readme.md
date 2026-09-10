# security-no-xxe

Do not enable XML entity expansion or DTD loading.

- **Preset:** `security-audit` only (`warn`). Deliberately not in `configs.security`.
- **Impact if exploited:** high
- **Analysis confidence:** high — the finding is a literal in the source with no dataflow to be wrong about.
- **CWE:** [CWE-611: Improper Restriction of XML External Entity Reference](https://cwe.mitre.org/data/definitions/611.html)
- **CAPEC:** [CAPEC-221](https://capec.mitre.org/data/definitions/221.html)
- **OWASP:** [A02:2025 – Security Misconfiguration](https://owasp.org/Top10/2025/A02_2025-Security_Misconfiguration/) · [A05:2021 – Security Misconfiguration](https://owasp.org/Top10/A05_2021-Security_Misconfiguration/) (previous edition)
- **ASVS 5.0:** `v5.0.0-1.5.1` — "Verify that the application configures XML parsers to use a restrictive configuration and that unsafe features such as resolving external entities are disabled to prevent XML eXternal Entity (XXE) attacks."

## Why it matters

External entities permit file reads from the server (XXE) and billion-laughs denial of service. Covers libxml-js option shapes; parsers with entities off by default stay quiet.

## Incorrect

```js
parseXml(xml, { noent: true })
```

## Correct

```js
libxmljs.parseXml(xml)
```

## Limitations

Stated honestly: xml2js and other JS-native parsers that do not resolve external entities are not flagged — flagging them would be wrong rather than merely noisy.

**Verified for xml2js specifically** (7 Kaliber projects depend on it, all
pinned to `^0.6.2`, zero coverage before this note — investigated as a
candidate extension and found structurally not applicable, not merely
unconfigured):

- xml2js parses XML via `sax`, a pure-JS streaming parser with no
  filesystem or network access anywhere in its entity-handling code (no
  `fs`/`http` call exists in it at all) — external entity resolution
  (`<!ENTITY xxe SYSTEM "file:///etc/passwd">`, the classic XXE file-read
  or SSRF payload) is not a capability the parser has, regardless of any
  option.
- xml2js's own `Parser.prototype.reset` constructs the underlying
  `sax.parser()` with a hardcoded three-key options object (`trim`,
  `normalize`, `xmlns`) — no other xml2js option, including anything
  entity- or DTD-related, is ever passed through. `sax`'s own
  entity-expansion DoS guards (`maxEntityCount`, default 512;
  `maxEntityDepth`, default 4) are consequently not reachable through
  xml2js's public API at all, in either direction: a consumer can neither
  weaken nor need to configure them.

There is no misconfiguration surface reachable through xml2js to detect —
not "not currently misused," but structurally absent. No rule was built
for it.

## Prior art

SonarJS S2755, OWASP XXE Prevention Cheat Sheet

## References

- [CWE-611](https://cwe.mitre.org/data/definitions/611.html)
- [OWASP XML External Entity Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/XML_External_Entity_Prevention_Cheat_Sheet.html)
- [codeql.github.com](https://codeql.github.com/codeql-query-help/javascript/js-xxe/)
- [github.com](https://github.com/advisories/GHSA-crh6-fp67-6883)

Scores, sources and references in `docs/research/rule-inventory.yaml`.
