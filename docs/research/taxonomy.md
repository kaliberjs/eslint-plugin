# Security taxonomy reference

Authoritative mapping reference for the security rules in `@kaliber/eslint-plugin`.
Owner: `cwe-taxonomist`. Companion artifact: `docs/research/rule-inventory.yaml` (per-rule
metadata; this file is the reference the inventory is checked against).

## Sources and versions

Every claim below was fetched from the primary source, not recalled. Pin these versions in
rule metadata; a mapping without an edition is not a mapping.

| Source | Version / edition | Date | Retrieved | How |
|---|---|---|---|---|
| CWE | **4.20** | 2026-04-30 | 2026-08-24 | `cwec_v4.20.xml` from `https://cwe.mitre.org/data/xml/cwec_latest.xml.zip` (also cross-checked against `https://cwe.mitre.org/data/csv/1000.csv.zip`, Research View 1000) |
| CAPEC | **3.9** | 2023-01-24 | 2026-08-24 | `https://capec.mitre.org/data/csv/1000.csv.zip` (Mechanisms of Attack view; 559 attack patterns) |
| OWASP Top 10 | **2021** | — | 2026-08-24 | `https://owasp.org/Top10/2021/` — all ten category pages fetched, HTTP 200 |
| OWASP Top 10 | 2025 (exists, **not used here**) | — | 2026-08-24 | `https://owasp.org/Top10/2025/` |
| OWASP Top 10 | 2017 (superseded, for drift notes) | — | 2026-08-24 | `https://owasp.org/www-project-top-ten/2017/` |
| OWASP API Security Top 10 | **2023** | — | 2026-08-24 | `https://owasp.org/API-Security/editions/2023/en/0x11-t10/` — all ten pages fetched, HTTP 200 |

Two vocabulary notes that this document leans on constantly:

- **"Official list"** means the CWE appears in that OWASP category's own *List of Mapped CWEs*
  section on owasp.org. That is a citation.
- **"Inferred"** means we reached the category by climbing the CWE parent chain, or by reading
  the category description. That is an argument. Both are legitimate; they are not the same
  thing and rule metadata must say which one it is.

---

## 1. OWASP Top 10 2021 (A01–A10)

Canonical index: <https://owasp.org/Top10/2021/>

The `Mapped CWEs` counts below are OWASP's own figures from each category's Factors table. Where
our extraction of the published list disagrees, it is noted — it matters, because reviewers cite
these lists as ground truth.

### A01:2021 – Broken Access Control
<https://owasp.org/Top10/2021/A01_2021-Broken_Access_Control/> — 34 mapped CWEs.
Notable CWEs per OWASP: CWE-200, CWE-201, CWE-352.

Official mapped list: 22, 23, 35, 59, 200, 201, 219, 264, 275, 276, 284, 285, 352, 359, 377,
402, 425, 441, 497, 538, 540, 548, 552, 566, 601, 639, 651, 668, 706, 862, 863, 913, 922, 1275.

JS/TS static-analysis rule families that legitimately map here:

| Family | Base CWE to cite | Realistic ESLint confidence |
|---|---|---|
| Path traversal into `fs` / `path` / `sendFile` sinks from request-derived input | CWE-23 or CWE-36 (not CWE-22 — see §3b) | medium |
| Open redirect (`res.redirect`, `location.assign`, `Location` header) from request-derived input | CWE-601 | medium |
| `Set-Cookie` / cookie-library options with `sameSite: 'none'` or omitted on a session cookie | CWE-1275 | high (config literal) |
| Symlink-unsafe file access, archive extraction without path containment ("Zip Slip") | CWE-59 or CWE-23 | low–medium |
| Insecure temp file paths (`/tmp/` + predictable name) | CWE-378 / CWE-379 (not CWE-377 — Class) | medium |
| IDOR: request-controlled key straight into a data lookup | CWE-639 | **low** — the missing ownership check is usually in another file |

**A01 is the category most often over-claimed.** Note that path traversal lives here, not in
A03 — OWASP filed CWE-22/23/35/59 under A01. Note also that "missing authorization on a route"
is not a single-file property: ESLint sees one module, not the middleware graph. Rules of that
shape belong at low confidence or not at all.

### A02:2021 – Cryptographic Failures
<https://owasp.org/Top10/2021/A02_2021-Cryptographic_Failures/> — OWASP states 29 mapped CWEs.
Notable CWEs per OWASP: CWE-259, CWE-327, CWE-331.

Official mapped list as published (30 entries): 259, 261, 296, 310, 319, 321, 322, 323, 324,
325, 326, 327, 328, 329, 330, 331, 335, 336, 337, 338, 340, 347, 523, 720, 757, 759, 760, 780,
818, 916. The published list contains 30 identifiers against a stated count of 29; four of them
(CWE-310, CWE-720, CWE-818, and — in A05 — CWE-16) are **Categories, not Weaknesses**, so they
are not valid mapping targets for a rule regardless of appearing on an OWASP list.

Rule families: weak hash for a security purpose (CWE-328; CWE-916 when the input is a password),
`Math.random()` used for a token/nonce/id (CWE-338), hardcoded crypto key (CWE-321), hardcoded
password (CWE-259), `http://` endpoint or `secure: false` cookie (CWE-319, CWE-614), broken
cipher / ECB mode / `createCipher` (CWE-327 → prefer CWE-1240 or CWE-328), JWT verification with
`algorithms: ['none']` or `decode()` used where `verify()` is required (CWE-347).

### A03:2021 – Injection
<https://owasp.org/Top10/2021/A03_2021-Injection/> — 33 mapped CWEs.
Notable CWEs per OWASP: CWE-79, CWE-89, CWE-73.

Official mapped list: 20, 74, 75, 77, 78, 79, 80, 83, 87, 88, 89, 90, 91, 93, 94, 95, 96, 97,
98, 99, 100, 113, 116, 138, 184, 470, 471, 564, 610, 643, 644, 652, 917.

This is the category where a JS/TS linter earns its keep, because most injection sinks are
syntactically identifiable in one file.

| Family | Base/Variant CWE | Notes |
|---|---|---|
| XSS: `dangerouslySetInnerHTML`, `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write`, `v-html`, `bypassSecurityTrustHtml`, jQuery `.html()` | CWE-79 | Claim CWE-80/83/87 only when the output context is provable from the AST (see §7.8) |
| SQL injection: template literal / `+` concatenation into `query()`, `raw()`, `sequelize.query`, `knex.raw` | CWE-89 | |
| NoSQL / query-logic injection: `$where`, operator objects built from `req.body` | CWE-943 (Class, Allowed-with-Review) | CWE 4.20 has **no** Base-level NoSQL injection entry; CWE-943's only Base children are 89, 90, 643, 652. Do not use CWE-89. |
| OS command injection: `child_process.exec` / `execSync` with concatenation | CWE-78 | |
| Argument injection: `spawn`/`execFile` with attacker-controlled leading `-` argument | CWE-88 | Distinct from CWE-78; `spawn` without a shell is not CWE-78 |
| Code injection: `eval`, `new Function`, `setTimeout(string)`, `vm.runInThisContext` | CWE-95 (Variant; Applicable Platforms names JavaScript explicitly) | Prefer CWE-95 over CWE-94 for eval-family sinks |
| Server-side template injection: user data into a template *source string* (Handlebars `compile`, EJS, Pug) | CWE-1336 | **Not in OWASP's A03 list** — CWE-1336 postdates the 2021 dataset. A03 here is *inferred*. |
| XPath / XML / LDAP injection | CWE-643 / CWE-91 / CWE-90 | CWE-91 is Allowed-with-Review; MITRE suggests CWE-611 if the real issue is XXE |
| Output encoding used in the wrong context | CWE-838 (Base) | Prefer over CWE-116 (Class) |

Log injection (CWE-117) is **not** in A03's list — OWASP files it under A09.

### A04:2021 – Insecure Design
<https://owasp.org/Top10/2021/A04_2021-Insecure_Design/> — 40 mapped CWEs. New in 2021.
Notable CWEs per OWASP: CWE-209, CWE-256, CWE-501, CWE-522.

Official mapped list: 73, 183, 209, 213, 235, 256, 257, 266, 269, 280, 311, 312, 313, 316, 419,
430, 434, 444, 451, 472, 501, 522, 525, 539, 579, 598, 602, 642, 646, 650, 653, 656, 657, 799,
807, 840, 841, 927, 1021, 1173.

A04 is a *design* category. A linter that maps many rules here is laundering "we could not find
a better category". Only two families really belong:

- Stack trace / `err.stack` / `err.message` returned in an HTTP response body — CWE-209.
- Security decision enforced only client-side (client-side-only validation or role check) — CWE-602
  (Class, Allowed-with-Review) → prefer CWE-603 or CWE-565 when the specific shape is clear.

`multer`/upload configuration without a type restriction is CWE-434, also A04 — but a lint rule
can only see the options object, so confidence is medium at best.

### A05:2021 – Security Misconfiguration
<https://owasp.org/Top10/2021/A05_2021-Security_Misconfiguration/> — 20 mapped CWEs.
Notable CWEs per OWASP: CWE-16, CWE-611.

Official mapped list: 2, 11, 13, 15, 16, 260, 315, 520, 526, 537, 541, 547, 611, 614, 756, 776,
942, 1004, 1032, 1174. (CWE-2 and CWE-16 are Categories — not valid rule targets.)

Rule families: `httpOnly: false` / omitted on a session cookie (CWE-1004), `secure: false` over
HTTPS (CWE-614), CORS `origin: '*'` together with `credentials: true` (CWE-942), XML parser with
entity expansion enabled (CWE-611), `NODE_TLS_REJECT_UNAUTHORIZED = '0'` (CWE-295 — but that is
A07's list, not A05's).

**Edition drift that matters here:** XXE was its own category, A4:2017 – XML External Entities.
In 2021 it is a CWE inside A05. Metadata saying "A04 XXE" is an un-editioned claim that is wrong
under 2021 (A04:2021 is Insecure Design).

### A06:2021 – Vulnerable and Outdated Components
<https://owasp.org/Top10/2021/A06_2021-Vulnerable_and_Outdated_Components/> — 3 mapped CWEs:
937, 1035, 1104. Two of the three (CWE-937, CWE-1035) are OWASP-legacy **Categories**; only
CWE-1104 (Use of Unmaintained Third Party Components, Base) is a weakness.

**No rule in this plugin may map to A06.** ESLint has no dependency-vulnerability data, no
lockfile resolution, and no advisory feed. This is SCA's job. See §7.13.

### A07:2021 – Identification and Authentication Failures
<https://owasp.org/Top10/2021/A07_2021-Identification_and_Authentication_Failures/> — 22 mapped
CWEs. Notable CWEs per OWASP: CWE-297, CWE-287, CWE-384.

Official mapped list: 255, 259, 287, 288, 290, 294, 295, 297, 300, 302, 304, 306, 307, 346, 384,
521, 613, 620, 640, 798, 940, 1216.

Rule families: hardcoded credential (CWE-798 → prefer CWE-259 for a password, CWE-321 for a key),
TLS verification disabled — `rejectUnauthorized: false`, `NODE_TLS_REJECT_UNAUTHORIZED='0'`,
`strictSSL: false` (CWE-295, or CWE-297 when hostname checking specifically is disabled).

Note CWE-259 appears on **both** the A02 and A07 official lists. A rule citing CWE-259 may
legitimately name either; naming both is also defensible, and naming neither is not.

### A08:2021 – Software and Data Integrity Failures
<https://owasp.org/Top10/2021/A08_2021-Software_and_Data_Integrity_Failures/> — 10 mapped CWEs.
New in 2021. Notable CWEs per OWASP: CWE-829, CWE-494, CWE-502.

Official mapped list: 345, 353, 426, 494, 502, 565, 784, 829, 830, 915.

Rule families: unsafe deserialization — `node-serialize.unserialize`, `js-yaml.load` without a
safe schema, `funcster`, a `JSON.parse` reviver that evals (CWE-502); `<script src>` to a
third-party origin without `integrity` (CWE-353); remote script/module loaded from a
runtime-computed URL (CWE-829); mass assignment of a request body into a persisted entity
(CWE-915 — this is on A08's list, which surprises people who expect A01).

### A09:2021 – Security Logging and Monitoring Failures
<https://owasp.org/Top10/2021/A09_2021-Security_Logging_and_Monitoring_Failures/> — 4 mapped
CWEs: 117, 223, 532, 778.

Rule families: logging a value whose identifier is a known credential name — `password`, `token`,
`secret`, `authorization`, `apiKey` (CWE-532); unescaped user input concatenated into a log line
(CWE-117). Absence of logging (CWE-778, CWE-223) is not detectable by a linter — do not claim it.

### A10:2021 – Server-Side Request Forgery (SSRF)
[owasp.org/Top10/2021/A10_2021-Server-Side_Request_Forgery_(SSRF)](https://owasp.org/Top10/2021/A10_2021-Server-Side_Request_Forgery_%28SSRF%29/) — exactly **1** mapped
CWE: 918.

Rule family: `fetch` / `axios` / `got` / `http.request` with a request-derived URL, host, or
`baseURL`. Cite CWE-918. This is the cleanest one-to-one category in the list: if the CWE is not
918, the category is not A10.

### 1b. Edition drift: 2017 → 2021, and the existence of 2025

2017 list (<https://owasp.org/www-project-top-ten/2017/>): A1 Injection, A2 Broken
Authentication, A3 Sensitive Data Exposure, A4 XML External Entities (XXE), A5 Broken Access
Control, A6 Security Misconfiguration, A7 Cross-Site Scripting (XSS), A8 Insecure
Deserialization, A9 Using Components with Known Vulnerabilities, A10 Insufficient Logging &
Monitoring.

Differences that change how a JS/TS rule maps:

1. **XSS lost its own category.** A7:2017 was XSS. In 2021 XSS is CWE-79 inside **A03**. An
   un-editioned "A07 XSS" tag is not merely vague — under 2021, A07 is Identification and
   Authentication Failures, so the tag is actively wrong. This is the single most common
   metadata bug in third-party rule sets.
2. **Deserialization lost its own category.** A8:2017 was Insecure Deserialization. In 2021
   CWE-502 sits inside **A08 Software and Data Integrity Failures** — same number, different
   meaning. Worst possible collision: "A08 deserialization" is right in both editions for
   different reasons.
3. **XXE lost its own category.** A4:2017 → CWE-611 inside **A05:2021**.
4. **Sensitive Data Exposure was renamed to Cryptographic Failures** (A3:2017 → A02:2021). OWASP
   states the old name was "a broad symptom rather than a root cause". Practically: "PII in a log
   line" is no longer an A02/A03 finding; it is **A09** (CWE-532). "PII in an error response" is
   **A04** (CWE-209).
5. **Access control moved up** (A5:2017 → A01:2021) and absorbed path traversal and open redirect.
6. **Three categories are new in 2021** and are largely undetectable by a linter: A04 Insecure
   Design, A08 Software and Data Integrity Failures (partly detectable), A10 SSRF (fully
   detectable).
7. **Injection moved down** (A1:2017 → A03:2021). Rules whose docs say "the #1 OWASP risk" are
   citing 2017.

**OWASP Top 10:2025 exists** (<https://owasp.org/Top10/2025/>, verified 2026-08-24) and
renumbers everything again: A01 Broken Access Control, A02 Security Misconfiguration, A03
Software Supply Chain Failures, A04 Cryptographic Failures, A05 Injection, A06 Insecure Design,
A07 Authentication Failures, A08 Software or Data Integrity Failures, A09 Security Logging and
Alerting Failures, A10 Mishandling of Exceptional Conditions. Note that **standalone SSRF is
gone** and **Injection is now A05**.

This project pins **2021** for now, deliberately: the 2021 category pages publish a machine-usable
*List of Mapped CWEs* that we can cite, and the ecosystem's rule metadata is still 2021-shaped.
Consequence: the `owasp` field must be written `A03:2021`, never `A03`. When we migrate, an
un-editioned field would silently change meaning — `A03` would go from Injection to Software
Supply Chain Failures.

---

## 2. OWASP API Security Top 10 2023 (API1–API10)

Canonical index: <https://owasp.org/API-Security/editions/2023/en/0x11-t10/>

**This is a different list.** It is maintained by a different OWASP project, has its own edition
cycle, and is scoped to API-specific risk. Do not treat `API1` as a variant spelling of `A01`.
A rule tagged both `A01:2021` and `API1:2023` is making **two independent claims**, each of which
a reviewer can accept or reject on its own evidence. In particular: SSRF is A10:2021 *and*
API7:2023, and both are correct — but "broken access control" (A01, a web-app risk category
spanning path traversal, redirects and permissions) and "broken object level authorization"
(API1, specifically per-object authorization on an API endpoint) are not the same claim, and
most rules that qualify for one do not qualify for the other.

| ID | Official title | URL | CWEs cited on the page | Statically detectable in JS/TS? |
|---|---|---|---|---|
| API1:2023 | Broken Object Level Authorization | <https://owasp.org/API-Security/editions/2023/en/0xa1-broken-object-level-authorization/> | CWE-285, CWE-639 | **Barely.** Request-controlled key into a lookup is visible; the absent ownership check is not. Low confidence. |
| API2:2023 | Broken Authentication | <https://owasp.org/API-Security/editions/2023/en/0xa2-broken-authentication/> | CWE-204, CWE-307 | **No.** Rate limiting and credential handling are cross-file/runtime. Exception: hardcoded credential (CWE-798) is visible, but that is A07:2021's territory. |
| API3:2023 | Broken Object Property Level Authorization | <https://owasp.org/API-Security/editions/2023/en/0xa3-broken-object-property-level-authorization/> | CWE-213, CWE-915 | **Yes, partly.** Mass assignment (`Object.assign(entity, req.body)`, `new Model(req.body)`, `{...req.body}` into a persisted entity) → CWE-915. Excessive data exposure (returning a whole entity) → CWE-213, low confidence. |
| API4:2023 | Unrestricted Resource Consumption | <https://owasp.org/API-Security/editions/2023/en/0xa4-unrestricted-resource-consumption/> | CWE-400, CWE-770, CWE-799 | **Yes, narrowly.** ReDoS → CWE-1333. Unbounded body/upload limit → CWE-770. Note the page cites CWE-400, which MITRE marks **Discouraged** — cite CWE-1333 or CWE-770 instead. |
| API5:2023 | Broken Function Level Authorization | <https://owasp.org/API-Security/editions/2023/en/0xa5-broken-function-level-authorization/> | CWE-285 | **No.** Route-to-guard mapping is a whole-app property. |
| API6:2023 | Unrestricted Access to Sensitive Business Flows | <https://owasp.org/API-Security/editions/2023/en/0xa6-unrestricted-access-to-sensitive-business-flows/> | none cited | **No.** Business-logic risk. No rule should claim API6. |
| API7:2023 | Server Side Request Forgery | <https://owasp.org/API-Security/editions/2023/en/0xa7-server-side-request-forgery/> | CWE-918 | **Yes.** Same rule family as A10:2021; both tags are correct and both should be stated. |
| API8:2023 | Security Misconfiguration | <https://owasp.org/API-Security/editions/2023/en/0xa8-security-misconfiguration/> | CWE-2, CWE-16, CWE-209, CWE-319, CWE-388, CWE-444, CWE-942 | **Yes.** CORS, cookie flags, TLS options, stack traces in responses. Overlaps A05:2021 heavily but is a separate claim. |
| API9:2023 | Improper Inventory Management | <https://owasp.org/API-Security/editions/2023/en/0xa9-improper-inventory-management/> | CWE-1059 | **No.** And note: the page's only cited CWE, **CWE-1059 Insufficient Technical Documentation, is marked Prohibited for mapping by MITRE** ("primarily a quality issue with no direct security implications"). An OWASP page citing a Prohibited CWE is a useful reminder that OWASP's citations are not CWE-conformant. |
| API10:2023 | Unsafe Consumption of APIs | <https://owasp.org/API-Security/editions/2023/en/0xaa-unsafe-consumption-of-apis/> | CWE-20, CWE-200, CWE-319 | **Yes, narrowly.** A third-party response flowing into a dangerous sink (`eval`, `innerHTML`, a shell) is visible: cite the *sink's* Base CWE (CWE-95, CWE-79, CWE-78) and add `API10:2023`. Do not cite CWE-20 — Discouraged. |

Net position for this plugin: `API7:2023` and `API8:2023` are routinely correct; `API3:2023` and
`API4:2023` are correct for specific rules; the other six should almost never appear in our
metadata. If more than a third of our rules carry an API tag, the tags are decorative.

---

## 3. CWE reference table

CWE 4.20. `Mapping usage` is MITRE's own `Mapping_Notes/Usage` value from the CWE entry — not our
opinion. Parent chain follows `ChildOf` in the Research view (view 1000) up to the Pillar.
`[JS]` marks entries whose **Applicable Platforms** section names JavaScript explicitly; every
other entry here is "Not Language-Specific" or lists other languages, which is a fact worth
knowing before asserting a mapping for a JS-only rule.

Entry URL pattern: `https://cwe.mitre.org/data/definitions/<id>.html`

| CWE | Official name (CWE 4.20) | Abstraction | Parent chain to Pillar (view 1000) | Mapping usage | OWASP 2021 official list | CAPEC (from the CWE entry) |
|---|---|---|---|---|---|---|
| CWE-79 | Improper Neutralization of Input During Web Page Generation ('Cross-site Scripting') | Base | CWE-74 -> CWE-707 | **Allowed** | A03 | CAPEC-63, CAPEC-85, CAPEC-209, CAPEC-588, CAPEC-591, CAPEC-592 |
| CWE-80 | Improper Neutralization of Script-Related HTML Tags in a Web Page (Basic XSS) | Variant | CWE-79 -> CWE-74 -> CWE-707 | **Allowed** | A03 | CAPEC-18, CAPEC-32, CAPEC-86, CAPEC-193 |
| CWE-83 | Improper Neutralization of Script in Attributes in a Web Page | Variant | CWE-79 -> CWE-74 -> CWE-707 | **Allowed** | A03 | CAPEC-243, CAPEC-244, CAPEC-588 |
| CWE-87 | Improper Neutralization of Alternate XSS Syntax | Variant | CWE-79 -> CWE-74 -> CWE-707 | **Allowed** | A03 | CAPEC-199 |
| CWE-89 | Improper Neutralization of Special Elements used in an SQL Command ('SQL Injection') | Base | CWE-943 -> CWE-74 -> CWE-707 | **Allowed** | A03 | CAPEC-7, CAPEC-66, CAPEC-108, CAPEC-109, CAPEC-110, CAPEC-470 |
| CWE-90 | Improper Neutralization of Special Elements used in an LDAP Query ('LDAP Injection') | Base | CWE-943 -> CWE-74 -> CWE-707 | **Allowed** | A03 | CAPEC-136 |
| CWE-91 | XML Injection (aka Blind XPath Injection) | Base | CWE-74 -> CWE-707 | **Allowed-with-Review** | A03 | CAPEC-83, CAPEC-250 |
| CWE-94 | Improper Control of Generation of Code ('Code Injection') | Base | CWE-74 -> CWE-707 | **Allowed-with-Review** | A03 | CAPEC-35, CAPEC-77, CAPEC-242 |
| CWE-95 [JS] | Improper Neutralization of Directives in Dynamically Evaluated Code ('Eval Injection') | Variant | CWE-94 -> CWE-74 -> CWE-707 | **Allowed** | A03 | CAPEC-35 |
| CWE-78 | Improper Neutralization of Special Elements used in an OS Command ('OS Command Injection') | Base | CWE-77 -> CWE-74 -> CWE-707 | **Allowed** | A03 | CAPEC-6, CAPEC-15, CAPEC-43, CAPEC-88, CAPEC-108 |
| CWE-88 | Improper Neutralization of Argument Delimiters in a Command ('Argument Injection') | Base | CWE-77 -> CWE-74 -> CWE-707 | **Allowed** | A03 | CAPEC-41, CAPEC-88, CAPEC-137, CAPEC-174, CAPEC-460 |
| CWE-1336 [JS] | Improper Neutralization of Special Elements Used in a Template Engine | Base | CWE-94 -> CWE-74 -> CWE-707 | **Allowed** | none | none listed |
| CWE-643 | Improper Neutralization of Data within XPath Expressions ('XPath Injection') | Base | CWE-943 -> CWE-74 -> CWE-707 | **Allowed** | A03 | none listed |
| CWE-1321 [JS] | Improperly Controlled Modification of Object Prototype Attributes ('Prototype Pollution') | Variant | CWE-915 -> CWE-913 -> CWE-664 | **Allowed** | none | CAPEC-1, CAPEC-77, CAPEC-180 |
| CWE-502 [JS] | Deserialization of Untrusted Data | Base | CWE-913 -> CWE-664 | **Allowed** | A08 | CAPEC-586 |
| CWE-22 | Improper Limitation of a Pathname to a Restricted Directory ('Path Traversal') | Base | CWE-706 -> CWE-664 | **Allowed-with-Review** | A01 | CAPEC-64, CAPEC-76, CAPEC-78, CAPEC-79, CAPEC-126 |
| CWE-23 | Relative Path Traversal | Base | CWE-22 -> CWE-706 -> CWE-664 | **Allowed** | A01 | CAPEC-76, CAPEC-139 |
| CWE-36 | Absolute Path Traversal | Base | CWE-22 -> CWE-706 -> CWE-664 | **Allowed** | none | CAPEC-597 |
| CWE-59 | Improper Link Resolution Before File Access ('Link Following') | Base | CWE-706 -> CWE-664 | **Allowed** | A01 | CAPEC-17, CAPEC-35, CAPEC-76, CAPEC-132 |
| CWE-434 | Unrestricted Upload of File with Dangerous Type | Base | CWE-669 -> CWE-664 | **Allowed** | A04 | CAPEC-1 |
| CWE-377 | Insecure Temporary File | Class | CWE-668 -> CWE-664 | **Allowed-with-Review** | A01 | CAPEC-149, CAPEC-155 |
| CWE-918 | Server-Side Request Forgery (SSRF) | Base | CWE-441 -> CWE-610 -> CWE-664 | **Allowed** | A10 | CAPEC-664 |
| CWE-601 | URL Redirection to Untrusted Site ('Open Redirect') | Base | CWE-610 -> CWE-664 | **Allowed** | A01 | CAPEC-178 |
| CWE-1333 | Inefficient Regular Expression Complexity | Base | CWE-407 -> CWE-405 -> CWE-400 -> CWE-664 | **Allowed** | none | CAPEC-492 |
| CWE-400 | Uncontrolled Resource Consumption | Class | CWE-664 | **Discouraged** | none | CAPEC-147, CAPEC-227, CAPEC-492 |
| CWE-798 | Use of Hard-coded Credentials | Base | CWE-1391 -> CWE-1390 -> CWE-287 -> CWE-284 | **Allowed-with-Review** | A07 | CAPEC-70, CAPEC-191 |
| CWE-259 | Use of Hard-coded Password | Variant | CWE-798 -> CWE-1391 -> CWE-1390 -> CWE-287 -> CWE-284 | **Allowed** | A02, A07 | none listed |
| CWE-321 | Use of Hard-coded Cryptographic Key | Variant | CWE-798 -> CWE-1391 -> CWE-1390 -> CWE-287 -> CWE-284 | **Allowed** | A02 | none listed |
| CWE-330 | Use of Insufficiently Random Values | Class | CWE-693 | **Discouraged** | A02 | CAPEC-59, CAPEC-112, CAPEC-485 |
| CWE-338 | Use of Cryptographically Weak Pseudo-Random Number Generator (PRNG) | Base | CWE-330 -> CWE-693 | **Allowed** | A02 | none listed |
| CWE-326 | Inadequate Encryption Strength | Class | CWE-693 | **Allowed-with-Review** | A02 | CAPEC-20, CAPEC-112, CAPEC-192 |
| CWE-327 | Use of a Broken or Risky Cryptographic Algorithm | Class | CWE-693 | **Allowed-with-Review** | A02 | CAPEC-20, CAPEC-97, CAPEC-459, CAPEC-473, CAPEC-475, CAPEC-608 (+1 more) |
| CWE-328 | Use of Weak Hash | Base | CWE-326 -> CWE-693 | **Allowed** | A02 | CAPEC-68, CAPEC-461 |
| CWE-916 | Use of Password Hash With Insufficient Computational Effort | Base | CWE-328 -> CWE-326 -> CWE-693 | **Allowed** | A02 | CAPEC-55 |
| CWE-347 | Improper Verification of Cryptographic Signature | Base | CWE-345 -> CWE-693 | **Allowed** | A02 | CAPEC-463, CAPEC-475 |
| CWE-345 | Insufficient Verification of Data Authenticity | Class | CWE-693 | **Discouraged** | A08 | CAPEC-111, CAPEC-141, CAPEC-142, CAPEC-148, CAPEC-218, CAPEC-384 (+6 more) |
| CWE-295 | Improper Certificate Validation | Base | CWE-287 -> CWE-284 | **Allowed** | A07 | CAPEC-459, CAPEC-475 |
| CWE-319 | Cleartext Transmission of Sensitive Information | Base | CWE-311 -> CWE-693 | **Allowed** | A02 | CAPEC-65, CAPEC-102, CAPEC-117, CAPEC-383, CAPEC-477 |
| CWE-614 | Sensitive Cookie in HTTPS Session Without 'Secure' Attribute | Variant | CWE-319 -> CWE-311 -> CWE-693 | **Allowed** | A05 | CAPEC-102 |
| CWE-1004 | Sensitive Cookie Without 'HttpOnly' Flag | Variant | CWE-732 -> CWE-285 -> CWE-284 | **Allowed** | A05 | none listed |
| CWE-1275 | Sensitive Cookie with Improper SameSite Attribute | Variant | CWE-923 -> CWE-284 | **Allowed** | A01 | CAPEC-62 |
| CWE-532 | Insertion of Sensitive Information into Log File | Base | CWE-538 -> CWE-200 -> CWE-668 -> CWE-664 | **Allowed** | A09 | CAPEC-215 |
| CWE-209 | Generation of Error Message Containing Sensitive Information | Base | CWE-200 -> CWE-668 -> CWE-664 | **Allowed** | A04 | CAPEC-7, CAPEC-54, CAPEC-215, CAPEC-463 |
| CWE-639 | Authorization Bypass Through User-Controlled Key | Base | CWE-863 -> CWE-285 -> CWE-284 | **Allowed** | A01 | none listed |
| CWE-862 | Missing Authorization | Class | CWE-285 -> CWE-284 | **Allowed-with-Review** | A01 | CAPEC-665 |
| CWE-863 | Incorrect Authorization | Class | CWE-285 -> CWE-284 | **Allowed-with-Review** | A01 | none listed |
| CWE-284 | Improper Access Control | Pillar | (is a Pillar) | **Discouraged** | A01 | CAPEC-19, CAPEC-441, CAPEC-478, CAPEC-479, CAPEC-502, CAPEC-503 (+11 more) |
| CWE-285 | Improper Authorization | Class | CWE-284 | **Discouraged** | A01 | CAPEC-1, CAPEC-5, CAPEC-13, CAPEC-17, CAPEC-39, CAPEC-45 (+11 more) |
| CWE-602 | Client-Side Enforcement of Server-Side Security | Class | CWE-693 | **Allowed-with-Review** | A04 | CAPEC-21, CAPEC-31, CAPEC-162, CAPEC-202, CAPEC-207, CAPEC-208 (+6 more) |
| CWE-74 | Improper Neutralization of Special Elements in Output Used by a Downstream Component ('Injection') | Class | CWE-707 | **Discouraged** | A03 | CAPEC-3, CAPEC-6, CAPEC-7, CAPEC-8, CAPEC-9, CAPEC-10 (+31 more) |
| CWE-707 | Improper Neutralization | Pillar | (is a Pillar) | **Discouraged** | none | CAPEC-3, CAPEC-7, CAPEC-43, CAPEC-52, CAPEC-53, CAPEC-64 (+10 more) |
| CWE-20 | Improper Input Validation | Class | CWE-707 | **Discouraged** | A03 | CAPEC-3, CAPEC-7, CAPEC-8, CAPEC-9, CAPEC-10, CAPEC-13 (+45 more) |
| CWE-116 | Improper Encoding or Escaping of Output | Class | CWE-707 | **Allowed-with-Review** | A03 | CAPEC-73, CAPEC-81, CAPEC-85, CAPEC-104 |

Notes on the table:

- The CAPEC column reproduces the `Related_Attack_Patterns` field of the CWE entry itself, capped
  at six with a count of the remainder. **Every CAPEC ID in this document was checked against the
  CAPEC 3.9 catalogue and all resolve; zero unverified IDs.** The very long lists (CWE-20,
  CWE-74, CWE-284, CWE-285) are themselves evidence that those entries are too abstract to be a
  rule's identity.
- `OWASP 2021 official list` = the CWE appears in that category's published *List of Mapped CWEs*.
  `none` means it appears in **no** 2021 category list — true for CWE-36, CWE-400, CWE-707,
  CWE-1321, CWE-1333 and CWE-1336. That is a fact about OWASP's 2021 dataset, not a judgement
  about the weakness, and it is why `owasp: none` has to be an available answer (§6.6).
- CWE-259 is on two lists (A02 and A07). Overlap is normal; OWASP's categories are not disjoint.
- Only four of the 53 entries name **JavaScript** in Applicable Platforms: CWE-95, CWE-502,
  CWE-1321, CWE-1336. Everything else is `Not Language-Specific` (usable) or names other
  languages. Read that section before asserting a mapping (§6.3).

### 3b. Entries MITRE flags for restricted mapping use

MITRE publishes a `Vulnerability Mapping` verdict per CWE entry. It is ignored by almost every
tool that emits CWE identifiers. It is not advisory noise: `Discouraged` means MITRE has observed
this identifier being systematically misapplied, and `Prohibited` means it must not be used at
all. If our rule metadata cites a Discouraged Class where a Base exists, our metadata is wrong
even if the finding is right.

**Prohibited** — none of the CWEs in the table above. One relevant nearby case: **CWE-1059
Insufficient Technical Documentation** is Prohibited ("primarily a quality issue with no direct
security implications") and is nonetheless the only CWE cited by OWASP API9:2023.

**Discouraged (8 of the 53 entries above).** Never the primary `cwe` of a rule; acceptable only
in a `cwe_parents` / evidence-chain field.

| Discouraged entry | MITRE's stated reason (abridged, verbatim source) | Use instead for JS/TS |
|---|---|---|
| **CWE-707** Improper Neutralization (Pillar) | "extremely high-level, a Pillar" | The relevant injection Base: CWE-79, CWE-89, CWE-78, CWE-95, CWE-943's children |
| **CWE-74** Injection (Class) | "high-level and often misused when lower-level weaknesses are more appropriate" | CWE-79 (XSS), CWE-89 (SQL), CWE-78 (OS command), CWE-88 (argument), CWE-94/95 (code/eval), CWE-90 (LDAP), CWE-643 (XPath), CWE-91 (XML), CWE-1336 (template) |
| **CWE-20** Improper Input Validation (Class) | "commonly misused in low-information vulnerability reports… not useful for trend analysis… often misused when the root cause issue is related to how input is incorrectly *transformed*, instead of 'validated'" | The sink's Base CWE. If genuinely a validation defect, MITRE's own suggestions: CWE-1284 (quantity), CWE-1287 (type), CWE-1286 (syntax), CWE-1173 (framework misuse), CWE-116/838 (encoding), CWE-790 (filtering) |
| **CWE-400** Uncontrolled Resource Consumption (Class) | "often misused because it is conflated with the 'technical impact'… sometimes used for low-information vulnerability reports. It is a level-1 Class" | **CWE-1333** for ReDoS; **CWE-770** for unbounded allocation; CWE-834 for excessive iteration; CWE-405 for amplification |
| **CWE-330** Use of Insufficiently Random Values (Class) | "level-1 Class… might have lower-level children that would be more appropriate" | **CWE-338** for a non-CSPRNG (`Math.random()`); CWE-340 for predictable identifiers |
| **CWE-345** Insufficient Verification of Data Authenticity (Class) | "level-1 Class… might have lower-level children" | **CWE-347** for signature verification; **CWE-353** for a missing integrity check (SRI) |
| **CWE-284** Improper Access Control (Pillar) | "extremely high-level, a Pillar. Its name… is often misused in low-information vulnerability reports **or by active use of the OWASP Top Ten, such as 'A01:2021-Broken Access Control'**. It is not useful for trend analysis." | MITRE's suggestions: CWE-862, CWE-863, CWE-732, CWE-306, CWE-1390, CWE-286, CWE-923. For us: **CWE-639** (user-controlled key), CWE-1275 (SameSite), CWE-942 (CORS) |
| **CWE-285** Improper Authorization (Class) | "high-level and lower-level CWEs can frequently be used instead. It is a level-1 Class" | CWE-862, CWE-863, CWE-732 — and below those, **CWE-639** or **CWE-942** |

CWE-284's note deserves emphasis: MITRE names *the act of mapping from the OWASP Top 10 category
title* as a cause of misuse. Reversing the arrow — picking a CWE because we already decided the
OWASP category — is the exact failure this document exists to prevent. Direction of travel is
always **rule → sink semantics → Base CWE → (maybe) OWASP category**.

**Allowed-with-Review (11 entries).** Usable, but the reviewer must record *why* the more specific
child did not fit.

| Entry | MITRE's caveat | Preferred child when it applies |
|---|---|---|
| CWE-22 Path Traversal (Base) | "might have children that would be more appropriate… Consider CWE-23 for relative, CWE-36 for absolute" | CWE-23, CWE-36 |
| CWE-91 XML Injection (Base) | "might be confused with other weaknesses such as XXE" | CWE-611 if the issue is entity resolution |
| CWE-94 Code Injection (Base) | "frequently misused for vulnerabilities with a technical impact of 'code execution'… only applies when the product's functionality intentionally constructs all or part of a code segment" | **CWE-95** for `eval`/`new Function`; CWE-1336 for template sources |
| CWE-116 Improper Encoding or Escaping of Output (Class) | Class-level | CWE-838 (wrong encoding for context), CWE-117 (logs), CWE-644 (headers) |
| CWE-326 Inadequate Encryption Strength (Class) | Class-level | CWE-328 (weak hash) |
| CWE-327 Broken or Risky Crypto Algorithm (Class) | Class-level | CWE-328, CWE-1240, CWE-780 — note CWE-327's only children are those three; there is **no** Base entry for "ECB mode", so CWE-327 with a recorded justification is correct there |
| CWE-377 Insecure Temporary File (Class) | Class-level | CWE-378, CWE-379 |
| CWE-602 Client-Side Enforcement of Server-Side Security (Class) | Class-level | CWE-603, CWE-565 |
| CWE-798 Hard-coded Credentials (Base) | "has lower-level children that cover specific kinds of credentials… Consider CWE-259 and CWE-321" | CWE-259 (password), CWE-321 (crypto key) |
| CWE-862 Missing Authorization (Class) | Class-level | CWE-425, CWE-939 |
| CWE-863 Incorrect Authorization (Class) | Class-level | **CWE-639**, CWE-942, CWE-647, CWE-551 |

Also worth flagging, though not "Discouraged": **CWE-732** (Incorrect Permission Assignment) is
Allowed-with-Review with the note that it is "often misused for vulnerabilities in which
'permissions' are not checked, which is an authorization weakness". This matters because
**CWE-1004** (`HttpOnly`) sits under CWE-732 → CWE-285 → CWE-284 in the hierarchy, which is a
genuinely odd placement — cite CWE-1004 directly and do not climb that chain in prose.

Two Compound entries appear near our scope and both carry warnings: **CWE-352 (CSRF)** and
**CWE-384 (Session Fixation)** are Composites, "attack-oriented in nature", with MITRE noting
"there is a chance that future research or CWE scope clarifications will change or deprecate
them" and advising root-cause analysis instead. Neither is a good target for a lint rule.

---

## 4. CAPEC mappings

CAPEC 3.9 (2023-01-24). Every ID below was verified present in the CAPEC catalogue; names are
verbatim. Entry URL pattern: `https://capec.mitre.org/data/definitions/<id>.html`

CAPEC is an *attack* taxonomy, not a weakness taxonomy. It answers "how would this be exploited",
which is useful in a rule's docs and useless as a rule identity. Cite at most two: the Standard-
or Meta-level pattern, plus the Detailed pattern if our rule pins the variant.

| Attack pattern | CAPEC | Abstraction | Notes |
|---|---|---|---|
| SQL injection | **CAPEC-66** SQL Injection | Standard | Primary. Detailed children: CAPEC-7 Blind SQL Injection, CAPEC-108 Command Line Execution through SQL Injection, CAPEC-109 Object Relational Mapping Injection, CAPEC-110 SQL Injection through SOAP Parameter Tampering, CAPEC-470 Expanding Control over the Operating System from the Database |
| Command injection | **CAPEC-88** OS Command Injection | Standard | Also CAPEC-15 Command Delimiters (Standard), CAPEC-43 Exploiting Multiple Input Interpretation Layers (Detailed) |
| Argument injection | **CAPEC-6** Argument Injection | Standard | Parent-ish sibling: CAPEC-137 Parameter Injection (Meta) |
| Code injection / `eval` | **CAPEC-242** Code Injection | Meta | Also CAPEC-35 Leverage Executable Code in Non-Executable Files (Detailed), CAPEC-77 Manipulating User-Controlled Variables (Standard) |
| XSS — generic | **CAPEC-63** Cross-Site Scripting (XSS) | Standard | |
| XSS — reflected | **CAPEC-591** Reflected XSS | Detailed | |
| XSS — stored | **CAPEC-592** Stored XSS | Detailed | |
| XSS — DOM-based | **CAPEC-588** DOM-Based XSS | Detailed | The right one for `innerHTML` / `dangerouslySetInnerHTML` / `location.hash` sinks |
| XSS — other verified variants | CAPEC-18 XSS Targeting Non-Script Elements; CAPEC-32 XSS Through HTTP Query Strings; CAPEC-86 XSS Through HTTP Headers; CAPEC-199 XSS Using Alternate Syntax; CAPEC-209 XSS Using MIME Type Mismatch; CAPEC-243 XSS Targeting HTML Attributes; CAPEC-244 XSS Targeting URI Placeholders | Detailed | Use only when the rule actually pins that variant |
| Path traversal | **CAPEC-126** Path Traversal | Standard | Detailed: CAPEC-139 Relative Path Traversal, CAPEC-597 Absolute Path Traversal, CAPEC-64 Using Slashes and URL Encoding Combined to Bypass Validation Logic, CAPEC-76 Manipulating Web Input to File System Calls, CAPEC-78 Using Escaped Slashes in Alternate Encoding, CAPEC-79 Using Slashes in Alternate Encoding |
| Symlink / archive extraction | **CAPEC-132** Symlink Attack | Detailed | Also CAPEC-17 Using Malicious Files (Standard) |
| SSRF | **CAPEC-664** Server Side Request Forgery | Standard | The only CAPEC on CWE-918. Clean mapping. |
| ReDoS | **CAPEC-492** Regular Expression Exponential Blowup | Standard | The only CAPEC on CWE-1333. Clean mapping. |
| Deserialization | **CAPEC-586** Object Injection | Meta | The only CAPEC on CWE-502 |
| XPath injection | **CAPEC-83** XPath Injection | Detailed | |
| XML injection | **CAPEC-250** XML Injection | Standard | |
| LDAP injection | **CAPEC-136** LDAP Injection | Standard | |
| Hardcoded secret in shipped code | **CAPEC-191** Read Sensitive Constants Within an Executable | Detailed | Genuinely apt for a browser bundle: the bundle *is* the shipped executable. Also CAPEC-70 Try Common or Default Usernames and Passwords (Detailed) for default creds |
| Secret reuse downstream | CAPEC-555 Remote Services with Stolen Credentials (Standard), CAPEC-600 Credential Stuffing (Standard) | | Post-exploitation; cite only in prose |
| Weak PRNG for session values | **CAPEC-59** Session Credential Falsification through Prediction | Detailed | On CWE-330; the right pattern when `Math.random()` produces a session token |
| Weak hash | **CAPEC-461** Web Services API Signature Forgery Leveraging Hash Function Extension Weakness (Standard), CAPEC-55 Rainbow Table Password Cracking (Detailed) | | 55 for password hashing (CWE-916) |
| Cleartext transmission | **CAPEC-102** Session Sidejacking (Detailed), CAPEC-117 Interception (Meta), CAPEC-65 Sniff Application Code (Detailed) | | |
| Cookie without SameSite | **CAPEC-62** Cross Site Request Forgery | Standard | The only CAPEC on CWE-1275 |
| Signature verification bypass | **CAPEC-475** Signature Spoofing by Improper Validation (Detailed), CAPEC-463 Padding Oracle Crypto Attack (Detailed) | | On CWE-347 |
| Certificate validation disabled | **CAPEC-459** Creating a Rogue Certification Authority Certificate | Detailed | On CWE-295 |
| Mass assignment / prototype write | CAPEC-77 Manipulating User-Controlled Variables | Standard | The least-bad fit; see the rejection below |

### 4b. Attack patterns with no usable CAPEC — record `capec: none`

- **Open redirect.** `UNVERIFIED — no CAPEC exists.` CWE-601's only related attack pattern is
  **CAPEC-178 Cross-Site Flashing**, which is a Flash/`SWF` `getURL` pattern. Searched CAPEC 3.9
  for `redirect` in names and alternate terms: only CAPEC-159 Redirect Access to Libraries and
  CAPEC-187 Malicious Automated Software Update via Redirection, neither of which is open
  redirect. Verdict: `capec: none`. See §7.6.
- **Prototype pollution.** `UNVERIFIED — no CAPEC exists.` Searched `prototype` across CAPEC 3.9
  names and alternate terms: zero hits. CWE-1321 lists CAPEC-1, CAPEC-77 and CAPEC-180, which are
  access-control and variable-manipulation patterns. CAPEC-77 (Manipulating User-Controlled
  Variables) is the least-bad and may be cited with a note; CAPEC-1 and CAPEC-180 must not be.
- **Server-side template injection.** `UNVERIFIED — no CAPEC exists.` Searched `template inject`:
  zero hits. CWE-1336 lists no related attack patterns at all.
- **NoSQL injection.** `UNVERIFIED — no CAPEC exists` for NoSQL specifically. CAPEC-66 is SQL.
  Record `capec: none` rather than borrowing CAPEC-66.
- **Log injection.** CWE-117 exists but has no clean CAPEC in scope; `capec: none`.

---

## 5. Severity x confidence matrix

Two independent axes, per `AGENTS.md`. **Severity** is the impact if the finding is true and
exploited — a property of the vulnerability class, essentially constant per rule. **Confidence**
is how sure *this* analysis is about *this* code — a property of the detection, varying per rule
and sometimes per report site.

Severity anchors (assign from the CWE, not from feeling):

| Severity | Meaning | Examples |
|---|---|---|
| `critical` | Remote code execution or full data-store compromise | CWE-78, CWE-95, CWE-502, CWE-89 with a proven taint path |
| `high` | Account takeover, cross-user data access, auth bypass | CWE-79, CWE-918, CWE-639, CWE-347, CWE-798 |
| `medium` | Information disclosure, weakened control, availability | CWE-1333, CWE-532, CWE-209, CWE-338, CWE-614, CWE-1004 |
| `low` | Defence-in-depth gap, hardening | CWE-1275, missing SRI (CWE-353) |

Confidence anchors:

| Confidence | Meaning |
|---|---|
| `high` | Sink is unambiguous **and** the dangerous argument is provably attacker-influenced within the file, or is a literal (a hardcoded key needs no taint) |
| `medium` | Sink is unambiguous, taint is plausible but not proven in-file (parameter of an exported function, imported value, `req` reaching the sink through a helper) |
| `low` | Sink or taint is heuristic: name-based matching, entropy scoring, cross-file assumption, framework behaviour we cannot see |

### The matrix → default ESLint level

ESLint 10 has three levels: `off`, `warn`, `error`. There is no `info`. The level is therefore
our *only* channel for communicating confidence to the consumer, so it encodes confidence first.

| | confidence `high` | confidence `medium` | confidence `low` |
|---|---|---|---|
| severity `critical` | **error** | **warn** | **off** (opt-in) |
| severity `high` | **error** | **warn** | **off** (opt-in) |
| severity `medium` | **warn** | **warn** | **off** (opt-in) |
| severity `low` | **warn** | **off** (opt-in) | **off** (opt-in) |

Shipped configs:

- `security` (recommended, default) — everything at `error` or `warn` above.
- `security-strict` — promotes the `warn` column-2 cells to `error`. For teams that have already
  cleaned the `warn` backlog and want a gate. Opt-in, never the default.
- `security-heuristic` — turns the `off` cells on at `warn`. For an audit pass, never CI.

A rule's `meta` carries `severity` and `confidence` as separate fields plus the derived level;
the derivation lives in `machinery/security/finding.js` so the matrix exists once, as data.

### Why high severity + low confidence must not default to `error`

1. **`error` is a build gate, not a priority label.** It sets the ESLint exit code, so it fails
   CI. The question at a gate is "is this finding *true*", which is the confidence axis. Gating on
   severity is gating on the wrong axis: it asks "would this be bad if true".
2. **The remedy for a false `error` is worse than the finding.** A developer facing a blocking
   false positive has two options: restructure correct code until the matcher stops firing, or add
   `eslint-disable-next-line`. The first ships a worse codebase for no security gain; the second
   is a permanent hole that outlives the reason for it.
3. **Disable-comment inflation destroys the whole signal, not just one line.** Once a repo carries
   thirty `eslint-disable` comments for security rules, nobody reads the thirty-first, and
   reviewers stop treating the marker as meaningful. One noisy high-severity rule can render every
   *quiet, correct* rule in the plugin invisible.
4. **Asymmetric, irreversible cost.** A `warn` on a true critical finding costs "someone reads it
   in review" — recoverable, and it is still in the output. An `error` on a false one costs
   "the team deletes the plugin from `eslint.config.js`" — at which point we lose 100% of findings
   to have caught 100% of a rule we got wrong. `AGENTS.md` states the metric: useful findings ÷
   false-positive burden. Errors multiply the denominator.
5. **Collapsing the axes is lossy and irreversible.** If level is computed from a single blended
   "risk" number, we can no longer answer "which of our high-severity rules are heuristic?" — the
   question we need for every future tuning decision. Two fields cost nothing; one blended field
   cannot be un-blended.
6. **Low confidence often means we do not know the *severity* either.** A name-matched
   `apiKey = "..."` might be a real production credential (critical) or a test fixture
   (none). Escalating on the pessimistic reading asserts a severity we have not established.
7. **Static analysis cannot prove presence, only suspicion.** A finding at low confidence is a
   hypothesis addressed to a human. `error` addresses it to a machine, which cannot evaluate it.

The corollary, stated so it is not misread as timidity: **high severity + high confidence is
`error`, without hesitation.** `child_process.exec` with a concatenated `req.query` value in the
same function should fail the build. The discipline is about the low-confidence column, not about
softening the whole plugin.

---

## 6. Mapping discipline — reviewer checklist

Each item is a yes/no a reviewer can check against the rule's metadata and this document. A `no`
blocks the mapping, not necessarily the rule.

1. **Base or Variant, not Class or Pillar.** Is the primary `cwe` at Base or Variant abstraction?
   If it is a Class or Pillar, is there a recorded reason no child fits?
2. **MITRE's own verdict is quoted.** Does the metadata carry the CWE's `Mapping usage` value? If
   it is `Discouraged` or `Prohibited`, the mapping is rejected — see §3b for the substitute. If
   `Allowed-with-Review`, the review note is present.
3. **Applicable Platforms was read.** Does the CWE's Applicable Platforms section include
   JavaScript, or "Not Language-Specific"? A JS rule citing a CWE whose platforms are
   `PHP`/`Java`-only needs an explicit justification (CWE-193, CWE-88's PHP prevalence, and the
   `7PK` category entries are the usual traps).
4. **Direction of travel is rule → CWE → OWASP.** Was the CWE chosen from the sink's semantics,
   or reverse-engineered from a desired OWASP category? MITRE names the latter explicitly as the
   cause of CWE-284 misuse.
5. **The OWASP claim is cited or labelled inferred.** Is the CWE on that category's published
   *List of Mapped CWEs*? If yes, link the category page. If no, the field reads
   `owasp: A03:2021 (inferred)` with a one-line argument. CWE-1336 → A03 and CWE-1321 → anything
   are the standing examples.
6. **`owasp: none` was considered and is available.** Would `none` be the honest answer? ReDoS
   (CWE-1333) and prototype pollution (CWE-1321) are on no 2021 list. Writing `none` is a pass,
   not a failure. Forcing a fit to make a rule look important is a rejection.
7. **The edition is in the string.** `A03:2021`, not `A03`. `API7:2023`, not `API7`. A Top 10 tag
   and an API Top 10 tag are two separate fields making two separate claims, and neither implies
   the other.
8. **Severity and confidence are separate fields.** Neither is derived from the other; the ESLint
   level is derived from both via `machinery/security/finding.js`. No rule sets its level directly.
9. **The CAPEC is verified or absent.** Does the CAPEC ID resolve in the current catalogue, and is
   its abstraction Standard or Meta unless the rule pins a variant? `capec: none` is correct for
   open redirect, prototype pollution, SSTI and NoSQL injection (§4b).
10. **The parent chain is recorded, not asserted.** `cwe_parents` matches the CWE Research view
    (view 1000) `ChildOf` chain, so a future reviewer can see which ancestor an OWASP inference
    travelled through.
11. **Every identifier has a URL.** `cwe.mitre.org/data/definitions/<id>.html`,
    `capec.mitre.org/data/definitions/<id>.html`, the owasp.org category page. An identifier
    without a resolvable URL does not ship.
12. **Limitations are stated in the rule's readme.** Specifically: what the rule cannot see
    (cross-file taint, framework sanitizers, runtime configuration) and therefore what a clean
    run does not prove.

---

## 7. Rejections

Mappings that other tools ship and that this project will not, with reasoning. These are
judgements, argued rather than asserted, and open to being overturned by a better argument.

**7.1 `obj[key]` → "injection" / CWE-79 (`eslint-plugin-security`'s `detect-object-injection`).**
A computed member expression is not neutralization failure in an output context, so it is not
CWE-74's subtree at all. When the *write* target is computed and the key can be `__proto__` /
`constructor`, the correct entry is CWE-1321 (Variant) or CWE-915 (Base). When it is a read, or
an array index, there is no weakness. The rule as shipped fires on ordinary indexing and is
famous for being disabled wholesale — which is exactly the adoption failure mode in §5.2.
**Verdict: reject the CWE, and reject the rule shape.** A prototype-pollution rule must key on
the write sink and the key's provenance, not on the syntax of member access.

**7.2 Every taint finding → CWE-20 Improper Input Validation.**
Common in Semgrep and SonarQube rule metadata. CWE-20 is `Discouraged`, and MITRE's rationale
names this exact misuse: "commonly misused in low-information vulnerability reports… not useful
for trend analysis", plus the deeper point that most of these are *transformation* defects
(encoding, filtering) rather than validation defects. **Verdict: reject.** Cite the sink's Base
CWE. CWE-20 may appear in a parent chain, never as the primary.

**7.3 `Math.random()` → CWE-330.**
Two errors in one. CWE-330 is a `Discouraged` level-1 Class; the Base is **CWE-338**. And more
importantly: `Math.random()` is only a weakness when the value becomes a token, nonce, key,
session id or password reset value. `Math.random()` picking a background colour or jittering a
retry is not a finding at any confidence. **Verdict: reject CWE-330; require a security-relevant
consumer before reporting at all.**

**7.4 Prototype pollution → A01:2021 Broken Access Control (or A08, silently).**
There is a real ambiguity here and tools resolve it silently in both directions. CWE-1321's chain
is CWE-1321 → CWE-915 → CWE-913 → CWE-664. **CWE-913 is on A01's official list; CWE-915 is on
A08's official list.** So whichever ancestor you climb to determines the answer, and neither is a
citation for CWE-1321 itself. **Verdict: `owasp_top10_2021: none`,** with the ancestor ambiguity
recorded. Picking one and presenting it as OWASP's mapping is the rejected behaviour, not picking
a particular one.

**7.5 `no-eval` → CWE-95 / A03:2021 at `error`.**
CWE-95 is *"Improper Neutralization of Directives in Dynamically Evaluated Code"* — it requires
attacker-influenced directives. `eval('2 + 2')`, or `new Function` in a build-time code
generator, is a code-quality issue and possibly a CSP incompatibility, not CWE-95. **Verdict:
split.** A taint-free `eval` ban is a style rule with `cwe: none`; the tainted case is CWE-95,
severity `critical`, and its level follows the confidence of the taint analysis.

**7.6 Open redirect → CAPEC-178 Cross-Site Flashing.**
CAPEC-178 is CWE-601's only related attack pattern and it is about Flash `getURL`. Flash was
end-of-life in 2020. Emitting CAPEC-178 from a 2026 JavaScript linter is citation theatre: it
looks like evidence and conveys nothing true. **Verdict: reject; `capec: none`** (§4b).

**7.7 ReDoS → CWE-400.**
`Discouraged`, and MITRE's rationale is precisely this case — CWE-400 gets used for the
*technical impact* (resources were consumed) instead of the *mistake* (a regex with
super-linear backtracking). MITRE's suggestion list points at CWE-405 and CWE-770; the exact Base
is **CWE-1333 Inefficient Regular Expression Complexity**. **Verdict: reject CWE-400.**

**7.8 XSS in a React/Vue component → CWE-80 or CWE-83.**
CWE-80 is specifically about `<script>`-tag neutralization; CWE-83 about attribute contexts. A
`dangerouslySetInnerHTML={{ __html: userInput }}` sink does not tell you which context the payload
lands in — that depends on the string, at runtime. **Verdict: cite CWE-79 (Base).** CWE-80/83/87
are permitted only where the AST proves the context, e.g. interpolation inside a quoted attribute
in an HTML template literal (CWE-83) or an explicitly built `<script>` body (CWE-80). Precision
you cannot justify is not precision.

**7.9 Missing CSP / `helmet` not configured → CWE-693 Protection Mechanism Failure.**
CWE-693 is a `Discouraged` Pillar. Worse, the finding itself is not a single-file property: the
header may be set by a reverse proxy, a platform edge config, or a middleware in another module.
A linter asserting its absence is guessing. **Verdict: reject the CWE and, in the default config,
the rule.** If shipped at all: `cwe: none`, `owasp: A05:2021 (inferred)`, confidence `low`,
`security-heuristic` only. The frames/clickjacking sub-case has a real Base — CWE-1021 — and only
that sub-case may cite it.

**7.10 Hardcoded secret → CWE-798 at `error`.**
Two problems. CWE-798 is `Allowed-with-Review` with MITRE explicitly pointing at CWE-259
(password) and CWE-321 (crypto key) — if the identifier tells you which, cite the child. And
detection is inherently heuristic: entropy and name matching cannot distinguish a production
credential from a test fixture, an example key from a vendor README, or a *public* key (which is
not a finding at all). **Verdict: never `error` by default;** severity `high`, confidence
`medium` at best → `warn`.

**7.11 NoSQL injection → CWE-89.**
CWE-89 is SQL, by name and by description, and its parent CWE-943's only Base children are 89,
90, 643 and 652. Mongo `$where` or operator injection from `req.body` is real, and CWE 4.20 simply
has no Base entry for it. **Verdict: cite CWE-943 (Class, Allowed-with-Review) with the recorded
justification "no Base-level NoSQL entry exists in CWE 4.20". Reject CWE-89.**

**7.12 Un-editioned OWASP tags, especially "A07 XSS".**
Widespread in legacy rule metadata carried over from 2017-era tooling. Under 2021, A07 is
Identification and Authentication Failures, so the tag is not vague — it is false. The same trap
exists for "A08 deserialization" (right in both editions, for different reasons) and "A04 XXE"
(A4:2017 → A05:2021; A04:2021 is Insecure Design). **Verdict: reject any OWASP field without an
edition suffix,** mechanically, at review time.

**7.13 Anything → A06:2021 Vulnerable and Outdated Components.**
A06's mapped CWEs are two OWASP-legacy Categories plus CWE-1104. ESLint has no advisory database,
no resolved dependency tree, and no version comparison. A rule that bans an import because the
package is *currently* known-vulnerable is a hardcoded snapshot that is wrong by the next release.
**Verdict: reject wholesale.** This is `npm audit` / Dependabot / Snyk territory. A rule banning a
package for a *design* reason (e.g. it exposes an unsafe API) maps to that API's CWE, not to A06.

**7.14 CSRF protection → CWE-352 from a lint rule.**
CWE-352 is a Compound whose own mapping note says "attack-oriented", warns that "future research
or CWE scope clarifications will change or deprecate them", and advises root-cause analysis
instead. And whether CSRF protection exists is a middleware-graph property, invisible to a
single-file pass. **Verdict: reject.** The one detectable neighbour is the cookie `SameSite`
attribute — CWE-1275, A01:2021 (official list), which is a genuinely good high-confidence rule.

**7.15 `res.send(err)` → CWE-200 Exposure of Sensitive Information.**
CWE-200 is `Discouraged`, with MITRE noting that "over 400 CWE entries can lead to a loss of
confidentiality" and that confidentiality loss is a technical impact, not a root cause. The Base
for an error message is **CWE-209**; for a log line, **CWE-532**; for a file, **CWE-538**.
**Verdict: reject CWE-200 as a primary.**
