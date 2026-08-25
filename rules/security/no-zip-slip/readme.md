# security-no-zip-slip

Check archive entry paths stay inside the extraction directory before
writing them.

- **OWASP:** [A01:2021 – Broken Access Control](https://owasp.org/Top10/A01_2021-Broken_Access_Control/)
- **CWE:** [CWE-22: Improper Limitation of a Pathname to a Restricted Directory](https://cwe.mitre.org/data/definitions/22.html)
  (parents: [CWE-706: Use of Incorrectly-Resolved Name or Reference](https://cwe.mitre.org/data/definitions/706.html),
  [CWE-664: Improper Control of a Resource Through its Lifetime](https://cwe.mitre.org/data/definitions/664.html))
- **CAPEC:** [CAPEC-126: Path Traversal](https://capec.mitre.org/data/definitions/126.html),
  [CAPEC-76: Manipulating Web Input to File System Calls](https://capec.mitre.org/data/definitions/76.html)
- **Severity:** high · **Confidence:** high

## What it detects

An archive stores the name of every entry it contains, and nothing stops
that name from being `../../etc/cron.d/x` or `/etc/cron.d/x`. Code that
writes an entry to a destination built from the entry's *own* name, without
checking where that destination lands, is an arbitrary file write — Zip
Slip.

The attacker-controlled value is intrinsic to the API shape (an entry's
`.path` / `.fileName` / `.entryName` / `.name`), so this is a call-shape
matcher like `no-weak-key-size`, not a taint rule: there is no HTTP request
to trace from, and no cross-file flow to follow.

```js
// unzipper — Parse() + the 'entry' event
stream.pipe(unzipper.Parse()).on('entry', entry => {
  entry.pipe(fs.createWriteStream(path.join(dest, entry.path)))       // reported
})

// yauzl
zipfile.on('entry', entry => {
  const target = path.join(dest, entry.fileName)                      // reported
  zipfile.openReadStream(entry, (err, s) => s.pipe(fs.createWriteStream(target)))
})

// adm-zip, unpacked by hand rather than through extractAllTo
zip.getEntries().forEach(entry => {
  fs.writeFileSync(path.join(dest, entry.entryName), entry.getData())  // reported
})

// node-stream-zip
zip.on('entry', entry => {
  fs.writeFileSync(path.join(dest, entry.name), zip.entryDataSync(entry))  // reported
})

// tar / tar-stream, writing entries out of an onentry or 'entry' handler
tar.x({ file: archive, cwd: dest, onentry: entry => {
  fs.writeFileSync(path.join(dest, entry.path), '')                   // reported
} })

// unzipper's Open.* API, iterated instead of extract()ed
const directory = await unzipper.Open.file(archive)
for (const file of directory.files) {
  fs.writeFileSync(path.join(dest, file.path), await file.buffer())   // reported
}
```

And the two options that switch a library's own protection off:

```js
tar.x({ file: archive, cwd: dest, preservePaths: true })              // reported
new StreamZip({ file: archive, skipEntryNameValidation: true })       // reported
```

## Correct

Resolve the destination, then assert it is inside the target directory:

```js
zip.on('entry', entry => {
  const target = path.resolve(dest, entry.path)
  if (!target.startsWith(path.resolve(dest) + path.sep)) return entry.autodrain()
  entry.pipe(fs.createWriteStream(target))
})
```

The `path.relative` form is equivalent, and is what node-tar and unzipper
both use internally:

```js
const relative = path.relative(dest, path.resolve(dest, entry.path))
if (relative === '' || relative.startsWith('..') || path.isAbsolute(relative)) return
```

Note that a `startsWith(dest)` *without* the trailing separator is the
sibling-prefix bug: `/srv/out` is a prefix of `/srv/out-old`. This is not a
theoretical nit — it is the bug in `decompress` today and was the bug in
`unzipper` until 0.12.5.

Or discard the archive's directory structure entirely, when you only want
the files:

```js
fs.createWriteStream(path.join(dest, path.basename(entry.path)))
```

Best of all: let the library do the extracting. `unzipper.Extract({ path })`,
`directory.extract({ path })`, `AdmZip#extractAllTo` and a plain
`tar.x({ cwd })` all containment-check internally — see below.

## What it deliberately does *not* report

A bare library extraction call. These check containment themselves, and
flagging them would make the rule wrong about the libraries it exists to
police:

| Call | Containment | Since | Evidence |
|---|---|---|---|
| `tar.x({ cwd })` / `tar.extract({ cwd })` | strips absolute paths, refuses `..`, refuses extraction through a symlink | documented default since the 4.x line; bypasses fixed repeatedly, see below | node-tar README: "`preservePaths` Allow absolute paths, paths containing `..`, and extracting through symbolic links. By default, `/` is stripped from absolute paths, `..` paths are not extracted, and any file whose location would be modified by a symbolic link is not extracted." Verified in the `tar@7.5.22` README installed in `landal-jobs`. |
| `unzipper.Extract({ path })` | `path.relative` check, skips the entry | `Extract` since 0.8.13 ([CVE-2018-1002203](https://github.com/advisories/GHSA-884w-698f-927f)); `Open.*.extract` since 0.10.0; correct form only since **0.12.5** | `lib/extract.js` and `lib/Open/directory.js` both compute `path.relative(opts.path, extractPath)` and skip when it starts with `..` or is absolute, under a comment naming zip slip. Verified in `unzipper@0.12.5` in `landal-jobs`. Before 0.12.5 the check was `extractPath.indexOf(opts.path) != 0` — the sibling-prefix bug above. |
| `AdmZip#extractAllTo`, `#extractEntryTo` | `canonical()` normalises `..` away, `sanitize()` walks the name down until it resolves inside the target | `sanitize()` since 0.4.11 ([CVE-2018-1002204](https://github.com/advisories/GHSA-3v6h-hqm4-2rg6)), `canonical()` since 0.5.2 | Verified in `adm-zip@0.5.18` and `@0.6.0` in `landal-jobs` / `landal-jobs-sanity6`. Note it *silently rewrites* a malicious name to `<dest>/<basename>` rather than throwing. |
| `zipfile.on('entry')` (yauzl) | `validateFileName()` rejects `\`, absolute and drive-letter paths, and any `..` segment, **before** the entry is emitted | yauzl 2.7.0 | yauzl README: "This field is automatically validated by `validateFileName()` before yauzl emits an 'entry' event. If this field would contain unsafe characters, yauzl emits an error instead of an entry." |
| `new StreamZip({ ... })` | `validateName()` throws on `\`, a drive letter, a leading `/` or any `../` | node-stream-zip 1.4.0 | Source: `if (/\\\|^\w+:\|^\/\|(^\|\/)\.\.(\/\|$)/.test(this.name)) throw new Error('Malicious entry: ' + this.name)`, run at central-directory read time unless `skipEntryNameValidation` is set. |

This is the most important design decision in the rule. A rule that fired on
every `tar.x(...)` would be reporting the *safe* way to extract an archive,
in the library that thirteen of our own projects use, and would be disabled
within a week.

**But note where the line is drawn.** The rule stays quiet on *library*
extraction and still reports *hand-rolled* extraction, even in yauzl and
node-stream-zip, whose entry names have already been validated by the time
you see them. That is not an inconsistency:

- With `tar.x({ cwd })` there is no user code to fix — the library does the
  writing and the check together.
- With a hand-rolled `path.join(dest, entry.fileName)` the safety is
  entirely contingent on a library default the author did not write and can
  turn off. yauzl's validation disappears with `decodeStrings: false`, is
  bypassed by `getFileNameLowLevel()` and by `readLocalFileHeader()`, and
  node-stream-zip's disappears with `skipEntryNameValidation: true`. Neither
  library validates *symlink targets* at all. The containment check costs
  three lines and is correct regardless of which library, which version and
  which options are in play.

So the finding on a default-options yauzl handler is defence in depth rather
than a live traversal; it is still the finding CodeQL's `js/zipslip` makes,
and still the code that should be written differently.

### The node-tar version boundary

Getting this right was the point of the exercise: a rule that blanket-flags
`tar.x` is wrong about its own most common library.

node-tar's containment is the documented default and has been since well
before 6.x. What the 2021 advisory series fixed was not "tar does not check"
but specific *bypasses* of the check:
[CVE-2021-32803](https://github.com/advisories/GHSA-r628-mhmh-qjhw) (symlink
dir-cache poisoning, fixed 6.1.2 / 5.0.7 / 4.4.15),
[CVE-2021-32804](https://github.com/advisories/GHSA-3jfq-g458-7qm9) (only one
path root stripped, so `////home/user/.bashrc` stayed absolute — fixed 6.1.1
/ 5.0.6 / 4.4.14; this is the advisory cited in the rule inventory),
[CVE-2021-37701](https://github.com/advisories/GHSA-9r2w-394v-53qc),
[CVE-2021-37712](https://github.com/advisories/GHSA-qq89-hq3f-393p) and
[CVE-2021-37713](https://github.com/advisories/GHSA-5955-9wpr-37jh) (fixed
**6.1.9 / 5.0.10 / 4.4.18**).

That series is not the end of it. node-tar shipped a further run of
containment bypasses in 2025–2026 — most recently
[CVE-2026-31802](https://github.com/advisories/GHSA-9ppj-qmqm-q256)
(drive-relative symlink traversal, fixed **7.5.11**) and
[CVE-2026-53655](https://github.com/advisories/GHSA-vmf3-w455-68vh) (PAX/GNU
long-name header differential, fixed **7.5.16**). The honest statement is
therefore:

> Bare `tar.x({ cwd })` is the correct, containment-checking way to extract a
> tarball, and this rule will not report it — but "we use tar's default" is
> necessary, not sufficient. Keep the version current. node-tar's own README
> says: "Stay up to date. Old versions of tar are not maintained or tested
> for newly discovered security advisories."

Which version is installed is a dependency-audit question (`npm audit`,
Dependabot), and A06:2021 is out of scope for this plugin by design — an
ESLint rule cannot see a package's installed version.

One tar detail the rule does act on: **`onentry` is not a check.** node-tar
calls it with entries that already passed `filter`, and it cannot refuse
anything; `filter` is the only blocking hook. (`onentry` was deprecated in
tar 7.4 in favour of `onReadEntry`, which is equally non-blocking.) So a
`filter` silences `preservePaths: true` and an `onentry` does not.

## What counts as "checked"

For the hand-rolled case, the rule goes quiet when a containment-shaped
check is visible anywhere in an enclosing function of the write:

- `.startsWith(...)` — the `resolved.startsWith(dest + path.sep)` idiom.
- `path.relative(...)` — the same check spelled the other way.
- `.indexOf(...)` — the pre-`startsWith` form.
- `path.basename(...)` — throws the archive's directory part away.
- A call whose *name* says it validates: `safeJoin`, `sanitizeEntryName`,
  `assertInsideDirectory`, `isContained`, `withinDest`, and anything else
  matching `safe|saniti[sz]|contain|inside|within|traversal|escape|assert`.
- For `tar.x` / `tar.extract`: a `filter` option being present at all, even
  alongside `preservePaths: true`.

The rule does not attempt to verify that the helper or the filter is
*correct*, mirroring no-jwt-algorithm-confusion accepting an `algorithms`
list whose contents it cannot evaluate. The reasoning is asymmetric: a rule
that fires at a developer who visibly wrote a containment check is a rule
that gets disabled, and disabling it loses the findings where nobody checked
anything — which is the overwhelming majority of real Zip Slip.

## Why high severity and high confidence

Severity is high: a successful Zip Slip is an arbitrary file write as the
application user, which is a straight path to code execution
(`.ssh/authorized_keys`, a cron file, a `.js` the server later requires).
The Snyk research that named the vulnerability found it across thousands of
projects and several ecosystems.

Confidence is high (1.0) and the message is not hedged. When this rule fires
it has read an actual archive-entry handler and an actual filesystem write
in the source, with no flow to be wrong about and no interprocedural guess —
and it has already established that no containment check is visible. This
matches the inventory's `false_positive_risk: 2` / `confidence: 4` scoring
and the posture of the other matcher-shaped rules (`no-weak-key-size`,
`no-jwt-algorithm-confusion`, `no-hardcoded-credentials`).

Validation against real code: the rule was run over every archive-handling
file in the Kaliber project fleet — 14 files across 13 projects, being the
`download-geoip-database.js` `tar.x` scripts and the two `landal-jobs`
`unzipper` scripts. Zero findings, all correct: the geoip scripts use a bare
`tar.x({ cwd })` with an `onentry` that only collects names, and the
`landal-jobs` scripts match one known entry by name and drain the rest
without ever writing an entry path to disk. That shape is asserted in
`false-positive.test.js`.

## Matching scope

An identifier is treated as an archive entry only when it is bound as:

- the parameter of an `'entry'` event handler — `.on`, `.once` or
  `.addListener` (unzipper's `Parse`, yauzl, node-stream-zip, tar-stream,
  node-tar's `Parse`);
- the parameter of an `onentry` / `onEntry` / `onReadEntry` option function
  (node-tar, extract-zip);
- the loop or callback variable over `directory.files` (unzipper's `Open.*`)
  or `zip.getEntries()` (adm-zip) — this weakest shape additionally requires
  an archive library to be imported in the same file, because `.files` alone
  is far too common a property name;
- a local alias or destructure of any of the above (`const it = entry`,
  `const { fileName } = entry`, `({ path: entryPath }) => ...`).

Without that provenance requirement, every `path.join(dir, file.name)` in
the codebase would be a Zip Slip finding — including uploads, glob results
and directory listings, which belong to `no-path-traversal`, not here.

The destination is then searched for that entry name through `path.join` /
`path.resolve`, template literals, `+` concatenation, ternaries and local
constant chains, and matched against a filesystem *write*
(`createWriteStream`, `writeFile(Sync)`, `appendFile`, `mkdir`, `copyFile`,
`rename`, `symlink`, `link`, and the fs-extra `outputFile` / `ensureDir`
family). For copy/move/rename/link the *second* argument is the one checked
— argument 0 there is the source being read. Reads are never reported: Zip
Slip is a write.

## Known gaps

Deliberate, and not worked around:

- **Symlink and hardlink entries.** An archive entry can be a symbolic link
  whose *target* points outside the destination; a later entry then writes
  through it. A containment check on the entry *name* does not catch this,
  so neither does a rule that looks for one. This is not exotic: it is the
  live, currently unpatched bug class in `extract-zip`
  ([CVE-2026-56876](https://github.com/advisories/GHSA-jmr9-qjv8-65gv)) and
  `decompress`
  ([CVE-2026-10732](https://github.com/advisories/GHSA-h39j-r5qq-r9mm),
  [CVE-2026-39243](https://github.com/advisories/GHSA-jwp9-9v96-94mx)), and
  the inventory's own documented false negative. node-tar refuses it by
  default; nothing else here does. If you unpack untrusted archives, reject
  `type === 'link' | 'symlink'` entries outright.
- **A guard that is present but wrong.** The prefix comparison
  `resolved.indexOf(dest) === 0` reads as a containment check to this rule
  and silences it, while `/srv/out-old` escapes `/srv/out`. Same for
  `if (entry.path.startsWith('__MACOSX')) return`, which is a filter, not a
  check. This is the deliberate direction of the trade described above.
- **`extract-zip` and `decompress` are not modelled as safe *or* flagged.**
  Their default extraction is not a clean call-shape match, and both carry
  open, unpatched arbitrary-file-write advisories today — extract-zip checks
  only the *parent* directory of each entry and writes symlinks with no
  target validation; decompress uses the sibling-prefix comparison for every
  format ([CVE-2026-53486](https://github.com/advisories/GHSA-mp2f-45pm-3cg9)).
  Neither of those is something a call-shape rule can express: they are
  version facts, i.e. `npm audit`'s job. `decompress`'s maintained fork is
  `@xhmikosr/decompress >= 11.1.3`. Their `onEntry` handlers *are* matched
  like any other entry handler.
- **Extraction inside a dependency.** Out of reach for a linter.
- **Zip bombs are a different weakness**
  ([CWE-409](https://cwe.mitre.org/data/definitions/409.html), resource
  exhaustion) and explicitly out of scope per the inventory. This rule says
  nothing about uncompressed size, entry count or compression ratio.
- **Interprocedural indirection.** A write wrapped in a same-file helper
  (`writeTo(path.join(dest, entry.path))`), or an entry handed to a helper
  (`zip.on('entry', handle)`), is a miss. Matcher-shaped rules here read the
  call site; the taint engine exists for flows, and an archive entry name is
  not a flow from a request. Asserted in `adversarial.test.js`.
- **Options the rule cannot read.** `preservePaths` behind a variable or
  `preservePaths: config.keepPaths` — the same accepted miss as
  no-weak-key-size's options object. Likewise yauzl's `decodeStrings: false`
  and `getFileNameLowLevel()`, which disable that library's own name
  validation: they are documented here rather than matched, because the
  hand-rolled write they enable is already what the rule reports.
- **A symlink at the destination itself** — adm-zip's `sanitize()` compares
  strings and then opens the result, so a pre-existing symlink in the output
  directory is followed (provisional
  [CVE-2026-76845](https://nvd.nist.gov/vuln/detail/CVE-2026-76845),
  unpatched). That is a runtime property of the filesystem, not of the
  source.

## Deliberately *not* a gap

**Provenance of the archive is not inferred.** Extracting an archive the
application produced itself, or a vendored dependency at build time, is
reported exactly like extracting an upload. Where the bytes came from is not
statically knowable — and the fix is three lines that cost nothing when the
archive is trusted. This is a known false-positive class, asserted in
`false-positive.test.js` rather than papered over: if the extraction is
genuinely trusted, disable the rule on that line with a comment saying why.

## Prior art

CodeQL [`js/zipslip`](https://codeql.github.com/codeql-query-help/javascript/js-zipslip/)
("Arbitrary file write during zip extraction") — the closest equivalent, and
the same core shape: an archive entry name flowing to a filesystem write.

SonarJS **S5042** is *not* the same rule despite the similar name:
"Expanding archive files should not be done without controlling resource
consumption" is about zip bombs (CWE-409), which this rule explicitly does
not cover. Do not conflate them. SonarJS **S6096** ("Extracting archives
should not lead to zip slip vulnerabilities") is the actual counterpart, but
its implementation lives in Sonar's closed-source security engine and could
not be verified — listed for completeness only.

## References

- [CWE-22: Improper Limitation of a Pathname to a Restricted Directory](https://cwe.mitre.org/data/definitions/22.html)
- [Snyk — Zip Slip vulnerability research](https://security.snyk.io/research/zip-slip-vulnerability)
- [CodeQL js/zipslip](https://codeql.github.com/codeql-query-help/javascript/js-zipslip/)
- [GHSA-3jfq-g458-7qm9 — node-tar arbitrary file creation/overwrite (CVE-2021-32804)](https://github.com/advisories/GHSA-3jfq-g458-7qm9)
- [node-tar README — `preservePaths`, `filter`, and the default containment behaviour](https://github.com/isaacs/node-tar#readme)
- [yauzl README — `validateFileName()`](https://github.com/thejoshwolfe/yauzl#readme)
