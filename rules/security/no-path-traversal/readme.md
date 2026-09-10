# security-no-path-traversal

Detects untrusted input flowing into filesystem path arguments.

- **Preset:** `security` (`warn`) and `security-audit` (`warn`)
- **Impact if exploited:** high
- **Analysis confidence:** computed per flow and reported in the message — the analysis is sure the value reaches the sink, less sure how far it travelled. Findings below the floor in `machinery/security/finding.js` are not reported at all.
- **CWE:** [CWE-22: Improper Limitation of a Pathname to a Restricted Directory ('Path Traversal')](https://cwe.mitre.org/data/definitions/22.html)
- **CAPEC:** [CAPEC-126](https://capec.mitre.org/data/definitions/126.html), [CAPEC-76](https://capec.mitre.org/data/definitions/76.html), [CAPEC-64](https://capec.mitre.org/data/definitions/64.html), [CAPEC-78](https://capec.mitre.org/data/definitions/78.html), [CAPEC-79](https://capec.mitre.org/data/definitions/79.html)
- **OWASP:** [A01:2025 – Broken Access Control](https://owasp.org/Top10/2025/A01_2025-Broken_Access_Control/) · [A01:2021 – Broken Access Control](https://owasp.org/Top10/A01_2021-Broken_Access_Control/) (previous edition)
- **ASVS 5.0:** `v5.0.0-5.3.2` — "Verify that when the application creates file paths for file operations, instead of user-submitted filenames, it uses internally generated or trusted data, or if user-submitted filenames or file metadata must be used, strict validation and sanitization must be applied. This is to protect against path traversal, local or remote file inclusion (LFI, RFI), and server-side request forgery (SSRF) attacks."

## What it detects

A flow from a registered untrusted source to a filesystem sink:

```
req.params.file  ->  file  ->  '/data/' + file  ->  fs.readFile()
     source           alias         path building        sink
```

Sinks (registry): the node:crypto... rather, the `fs`, `fs/promises` and
`node:fs` read/write families (`readFile`, `writeFile`, `createReadStream`,
`createWriteStream`, `unlink`, `rm`, `readdir`, `stat`, `access`, `open`,
`mkdir`, and Sync variants), plus Express `res.sendFile` / `res.download`.

This rule covers both directions of CWE-22 — traversal *out* of a base
directory via `../`, and arbitrary addressing within the process's
permissions. The inventory's separate no-arbitrary-file-read /
no-arbitrary-file-write entries detect identically (same sinks, same
analysis), so they are subsumed here rather than shipped as double reports.

## Incorrect

```js
function handler(req, res) {
  res.sendFile('/srv/uploads/' + req.params.file)   // ../../etc/passwd
}
```

## Correct

```js
function handler(req, res) {
  const resolved = path.resolve(BASE, req.params.file)
  if (!resolved.startsWith(BASE + path.sep)) return res.status(400).end()
  res.sendFile(resolved)
}
```

`path.basename(untrusted)` is a registered sanitizer for a single filename
(it strips directory components), with a documented imprecision: it still
permits arbitrary *names*, so an allowlist beats it when the set of files
is known.

## Limitations

Stated honestly:

- Archive entry names are a separate weakness (zip-slip) needing stream
  and event modeling — tracked in coverage-roadmap.md, not covered here.
- A tainted value that reaches the path through another module is invisible
  except through same-file helper summaries.
- `resolve-then-check` written with a non-literal base cannot be verified
  as containment; we stay quiet on resolved values only when the guard
  matches the shapes the flow-sensitivity layer proves.

## Prior art

CodeQL js/path-injection, Semgrep detect-non-literal-fs-filename,
eslint-plugin-security detect-non-literal-fs-filename.

## References

- [OWASP Path Traversal](https://owasp.org/www-community/attacks/Path_Traversal)

Scores, sources and references in `docs/research/rule-inventory.yaml`.
