# security-no-path-traversal

Detects untrusted input flowing into filesystem path arguments.

- **OWASP:** [A01:2021 – Broken Access Control](https://owasp.org/Top10/A01_2021-Broken_Access_Control/)
- **CWE:** [CWE-22: Improper Limitation of a Pathname to a Restricted Directory](https://cwe.mitre.org/data/definitions/22.html)
- **CAPEC:** [CAPEC-126](https://capec.mitre.org/data/definitions/126.html)
- **Severity:** high · **Confidence:** varies per finding, reported in the message

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
