# security-no-dynamic-require

Do not resolve modules from dynamic specifiers.

- **Preset:** `security-audit` only (`warn`). Deliberately not in `configs.security`.
- **Impact if exploited:** medium
- **Analysis confidence:** high — the finding is a literal in the source with no dataflow to be wrong about.
- **CWE:** [CWE-470: Use of Externally-Controlled Input to Select Classes or Code ('Unsafe Reflection')](https://cwe.mitre.org/data/definitions/470.html)
- **CAPEC:** [CAPEC-138](https://capec.mitre.org/data/definitions/138.html)
- **OWASP:** **not mapped** in the 2025 edition — see `docs/research/owasp-coverage.md` · [A03:2021 – Injection](https://owasp.org/Top10/A03_2021-Injection/) (previous edition)

## Why it matters

The module graph stops bounding what can be loaded; a tainted specifier becomes an arbitrary-module or arbitrary-file load. The fix is a static import or a literal-keyed lookup table over statically imported modules.

## Incorrect

```js
require(`./plugins/${name}`)
```

## Correct

```js
const PLUGINS = { a: require('./a'), b: require('./b') }; PLUGINS[name]
```

## Limitations

Stated honestly: createRequire bound to a variable (r2(p)) is a documented miss; only the chained form is matched.

## Prior art

eslint-plugin-security detect-non-literal-require, CodeQL js/unsafe-code-injection

## References

- [CWE-470](https://cwe.mitre.org/data/definitions/470.html)
- [CAPEC-138](https://capec.mitre.org/data/definitions/138.html)
- [OWASP Nodejs Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Nodejs_Security_Cheat_Sheet.html)

Scores, sources and references in `docs/research/rule-inventory.yaml`.
