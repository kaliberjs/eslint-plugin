# Framework & library security coverage

Knowledge base for `machinery/security/registry.js`. Every entry below is **data**, not a code
branch: one block per package, transcribable into the registry as-is.

Research date: **2026-08-24**. Every API in this document was verified against either the package
source on this machine or the official documentation page cited in the block. Anything that could
not be verified is marked `UNVERIFIED` with the attempt recorded.

## How to read an entry

```text
package: <npm name>
versions_verified: <what the facts were checked against>
docs: <primary source URL>
sources:            # untrusted input enters here
  - access: <exact member/call shape>
    taint: [<taint kinds this value carries>]
sinks:              # dangerous APIs
  - call: <exact call shape>
    danger: { arg: <index> } | { option: <key> } | { property: <name> }
    taint: <injection class if reached>
    safe_channel: <argument/option that is NOT interpolated, and why>
    detect: <AST shape notes — when to flag, when not to>
sanitizers:
  - call: <shape>
    neutralizes: [<taint kinds>]     # and ONLY these
    not: [<taint kinds it does not help with>]
```

## Taint kind vocabulary

A sanitizer is only a sanitizer *for a taint kind*. `escape-html` on a value flowing into
`client.query()` is not a mitigation; `mysql.escape()` on a value flowing into `innerHTML` is not
a mitigation. The registry must carry the kind, and rules must match kind-to-kind.

| kind | sink class | CWE |
|---|---|---|
| `html` | HTML/DOM XSS | CWE-79 |
| `js-url` | `javascript:` / `data:` URL in an href/src | CWE-79 |
| `sql` | SQL **value** position | CWE-89 |
| `sql-identifier` | SQL **identifier / keyword / ORDER BY** position — parameterization cannot cover this | CWE-89 |
| `nosql-operator` | MongoDB query-operator injection (`$ne`, `$gt`, …) | CWE-943 |
| `nosql-js` | server-side JS execution (`$where`, `$function`, `mapReduce`) | CWE-94 |
| `shell` | OS command / shell metacharacters | CWE-78 |
| `argv` | process argument (no shell) — much weaker, still an issue for flag injection | CWE-88 |
| `path` | filesystem path traversal | CWE-22 |
| `url` | SSRF / open redirect | CWE-918 / CWE-601 |
| `code` | JS source evaluated (`eval`, `vm`, `new Function`) | CWE-95 |
| `template` | server/client template source | CWE-1336 |
| `header` | response header / CRLF splitting | CWE-113 |
| `regex` | ReDoS via attacker-supplied pattern | CWE-1333 |
| `proto` | prototype pollution / mass assignment | CWE-1321 |

## Versions verified

`local` = read from source in a `node_modules` on this machine. `docs` = official documentation
fetched on 2026-08-24. `latest` = `npm view <pkg> version` on 2026-08-24.

| package | verified against | latest | drift risk |
|---|---|---|---|
| express | local 4.21.1 + Express 5 migration guide (docs) | 5.2.1 | **high** — `req.param()` removed in 5, `req.query` is a read-only getter and defaults to the *simple* parser, `req.body` is `undefined` (not `{}`) when unparsed |
| fastify | docs (v5 Reference/Request) | 5.12.1 | low |
| koa | docs (koajs.com) | 3.2.1 | low |
| @nestjs/common | docs (controllers.md, techniques/validation.md, master) | 11.2.1 | low |
| next | local 16.2.10 (type defs) | 16.3.2 | **high** — `headers()`, `cookies()`, `params`, `searchParams` became `Promise`-returning in 15; sync access is a v14 shape |
| hono | local 4.12.14 (type defs) | 4.13.3 | low |
| pg | local 8.14.1 | 8.23.0 | low |
| pg-format | docs (README) | 1.0.4 | low |
| mysql2 | docs + agent-verified source read of `lib/base/connection.js` | 3.24.1 | medium |
| mysql (legacy) | docs (mysqljs/mysql README) — reported last release 2.18.1 (2020) | n/a | frozen; unmaintained |
| sqlite3 | local 5.1.7 (`lib/sqlite3.js`, `lib/sqlite3.d.ts`) | 6.0.1 | medium — 6.x is a new major, signatures not re-verified |
| better-sqlite3 | local 12.6.2 + docs/api.md | 13.0.3 | medium — 13.x not re-verified |
| knex | docs (knexjs.org guide/raw) | 3.3.0 | low |
| sequelize | docs (v6 + v7 raw-queries) | 6.37.8 (v7 still alpha) | **high** — v7 replaces the API with an `sql` template tag |
| typeorm | docs (typeorm.io, 1.x) | 1.1.0 | **high** — 1.0 is a recent major after years of 0.3.x; `setNativeParameters`, `printSql`, `replacePropertyNames` were removed |
| @prisma/client | docs (raw-queries, typedsql) + `sql-template-tag` source | 7.9.1 | medium |
| drizzle-orm | local 0.44.7 (`sql/sql.js`, `sql/sql.d.ts`) | 0.45.2 | **high** — pre-1.0, minor versions are breaking |
| mongoose | docs (mongoosejs.com v9) | 9.9.3 | medium |
| mongodb | docs (MongoDB manual) | 7.5.0 | medium — `$where`/`$function`/`$accumulator` deprecated server-side in MongoDB 8.0 |
| jsonwebtoken | local 9.0.2 (`sign.js`, `verify.js`) | 9.0.3 | **high across majors** — v9 added algorithm/key-type confusion checks that v8 lacked |
| jose | local 6.2.2 (`dist/types/index.d.ts`) | 6.2.10 | low |
| dompurify | local 3.x (`dist/purify.cjs.js`, README) | 3.4.14 | low |
| escape-html | local 1.0.3 | 1.0.3 | none |
| he | local 1.2.0 | 1.2.0 | none |
| validator | source of `src/lib/escape.js` (master) | 13.15.35 | low |
| zod | local 4.4.3 (runtime introspection) | 4.4.3 | **high across majors** — v3→v4 moved parse helpers to top level |
| joi | local 17.13.3 | 18.2.5 | medium — 18.x not re-verified |
| yup | docs (README, master) | 1.7.1 | low |
| valibot | local 0.31.1 | 1.4.2 | **high** — 1.0 stabilised the API; 0.31 facts may not hold |
| axios | docs (axios.rest request-config) | 1.19.0 | low |
| undici | docs (Dispatcher API) | 8.10.0 | medium |
| got | docs (documentation/2-options.md) | 15.1.0 | low |
| node core (`fs`, `child_process`, `crypto`, `vm`, `http`, `path`) | docs (nodejs.org) + runtime introspection on Node **v24.15.0** | — | `crypto.createCipher`/`createDecipher` are **removed** (confirmed `undefined` on v24), not merely deprecated |
| Angular `DomSanitizer` | docs (angular.dev API) | — | low |
| Vue 3 `v-html` | docs (vuejs.org built-in-directives) | — | low |
| DOM sinks | docs (MDN Trusted Types API sink list) | — | low |

### Version-drift policy

Three drift classes, and they need different handling in the registry:

1. **Renames/removals** (`req.param()`, Sequelize v7, TypeORM 1.0, valibot 1.0). A registry entry
   that fires on a removed API is pure false positive. Gate these entries on a `versions:` range and
   let the registry carry both shapes where both are in the wild.
2. **Sync → async** (Next.js `headers()`/`cookies()`/`params`). The *source* is the same; only the
   access shape changed (`headers().get(x)` vs `(await headers()).get(x)`). Match the call, not the
   member chain, and taint the awaited value too.
3. **Semantics changed without the signature changing** — the dangerous class. `jsonwebtoken` 8 vs 9
   is the example: `verify(token, key)` looks identical, but v8 will happily verify an `HS256` token
   against an RSA *public* key. Signature matching cannot see this; only the installed version can.
   Where a fact depends on the major, the block below says so explicitly.

---

# 1. Sources — HTTP frameworks

## express

```yaml
package: express
versions_verified: "4.21.1 (local source: lib/request.js, lib/middleware/query.js, lib/router/index.js); Express 5 deltas from expressjs.com/en/guide/migrating-5.html"
docs: https://expressjs.com/en/4x/api.html#req
sources:
  - access: req.query            # object; set by the query middleware, qs.parse (4.x) / querystring (5.x default)
    taint: [sql, sql-identifier, html, shell, path, url, proto]
    note: "Express 4 default parser is 'extended' (qs) -> nested objects and arrays are possible, so req.query.x may be an object or array, not a string. Express 5 defaults to 'simple'. req.query is a read-only getter in 5."
  - access: req.body             # only exists if express.json()/express.urlencoded()/multer ran
    taint: [sql, sql-identifier, html, shell, path, url, nosql-operator, proto]
    note: "Express 4: {} when unparsed. Express 5: undefined when unparsed."
  - access: req.params           # set per-layer by the router
    taint: [sql, sql-identifier, html, shell, path, url]
    note: "Express 5: null-prototype object for string paths; wildcard params are arrays; unmatched params are omitted."
  - access: req.headers          # lowercase keys, from Node IncomingMessage
    taint: [sql, html, shell, path, url, header]
  - access: req.get(name)        # alias req.header(name); lib/request.js:64-65
    taint: [sql, html, shell, path, url, header]
  - access: req.cookies          # cookie-parser middleware
    taint: [sql, html, shell, path, url]
  - access: req.signedCookies    # cookie-parser with a secret; integrity-checked, NOT content-validated
    taint: [sql, html, shell, path, url]
  - access: req.url              # path + query only, never the full URL (Node IncomingMessage)
    taint: [path, url, html]
  - access: req.originalUrl      # pre-rewrite req.url
    taint: [path, url, html]
  - access: req.path
    taint: [path, url, html]
  - access: req.hostname         # derived from Host / X-Forwarded-Host -> attacker-controlled
    taint: [url, html, header]
  - access: req.ip               # derived from X-Forwarded-For when trust proxy is on
    taint: [html, log]
  - access: req.param(name)      # DEPRECATED in 4 (emits a deprecation warning), REMOVED in Express 5
    taint: [sql, sql-identifier, html, shell, path, url]
    note: "Source-verified lookup order: req.params -> req.body -> req.query. Do not register this source for Express >= 5."
```

## fastify

```yaml
package: fastify
versions_verified: "v5 documentation (Reference/Request, Reference/Routes, Reference/Validation-and-Serialization); latest 5.12.1"
docs: https://fastify.dev/docs/latest/Reference/Request/
handler_signature: "(request, reply)"   # NOT (req, res); the second arg is Fastify's Reply, not Node's res
sources:
  # every one of these is a plain property / getter -- never a method call
  - access: request.query
    taint: [sql, sql-identifier, html, shell, path, url, proto]
    note: "shape depends on the server-level querystringParser option"
  - access: request.body
    taint: [sql, sql-identifier, html, shell, path, url, nosql-operator, proto]
  - access: request.params
    taint: [sql, sql-identifier, html, shell, path, url]
    note: "Fastify percent-decodes route params BEFORE the handler runs -- '..%2ffile' arrives as '../file'. Directly relevant to path-traversal rules."
  - access: request.headers
    taint: [sql, html, shell, path, url, header]
    note: "getter AND setter -- assignment to request.headers is a taint-propagation edge"
  - access: request.raw           # Node IncomingMessage; request.raw.url bypasses Fastify entirely
    taint: [path, url, html]
  - access: request.url
    taint: [path, url, html]
  - access: request.originalUrl
    taint: [path, url, html]
  - access: request.hostname      # also host, port, protocol, ip, ips, socket, mediaType
    taint: [url, html, header]
  - access: request.cookies       # @fastify/cookie plugin only, NOT core
    taint: [sql, html, shell, path, url]
    note: "All cookies land in request.cookies regardless of signing. There is NO request.signedCookies; verification is the separate request.unsignCookie(value) -> { valid, renew, value }."
sanitizers:
  - form: "route option schema: { body, querystring | query, params, headers }"
    engine: "Ajv v8, configured by Fastify with coerceTypes: 'array'"
    neutralizes: []
    note: |
      Clears taint ONLY for the keys it constrains and ONLY for the constraints present.
      { type: 'string' } asserts nothing about content -- a schema-validated string is still
      html/sql tainted. Type coercion is conversion, not sanitization. removeAdditional is on by
      default via ajv-compiler, which mitigates mass assignment (proto) but nothing else.
      Registry: treat a schema as clearing 'proto' for unlisted keys, and as clearing all kinds
      only when the subschema is an enum/const/pattern narrow enough to be an allowlist.
```

## koa

```yaml
package: koa
versions_verified: "v3 documentation (koajs.com #context, #request); delegation cross-checked against koa/lib/context.js on master; latest 3.2.1"
docs: https://koajs.com/#request
sources:
  - access: ctx.request.query    # alias: ctx.query
    taint: [sql, sql-identifier, html, shell, path, url, proto]
    note: "Koa's own doc: this getter does NOT support nested parsing."
  - access: ctx.request.querystring   # alias: ctx.querystring -- raw string, no leading '?'
    taint: [sql, html, url]
  - access: ctx.request.body     # NOT core Koa. koa-bodyparser / @koa/bodyparser
    taint: [sql, sql-identifier, html, shell, path, url, nosql-operator, proto]
  - access: ctx.params           # NOT core Koa. @koa/router
    taint: [sql, sql-identifier, html, shell, path, url]
  - access: ctx.request.headers  # aliases: ctx.headers, ctx.header
    taint: [sql, html, shell, path, url, header]
  - access: ctx.get(name)        # delegates to ctx.request.get(name); case-insensitive
    taint: [sql, html, shell, path, url, header]
  - access: ctx.cookies.get(name, options)   # on ctx only -- ctx.cookies is NOT a request alias
    taint: [sql, html, shell, path, url]
  - access: ctx.request.url          # alias ctx.url (read AND write)
    taint: [path, url, html]
  - access: ctx.request.originalUrl  # alias ctx.originalUrl
    taint: [path, url, html]
  - access: ctx.URL                  # aliases ctx.request.URL -- a WHATWG URL
    taint: [url, html]
    note: "Source-verified via context.js getter('URL'). Absent from the documented alias list -- do not drop it because the docs omit it."
  - access: ctx.req                  # raw Node IncomingMessage, bypasses Koa
    taint: [path, url, html, header]
aliases_delegated_to_request:
  # documented set; ctx.X === ctx.request.X
  [header, headers, method, url, originalUrl, origin, href, path, query, querystring,
   host, hostname, fresh, stale, socket, protocol, secure, ip, ips, subdomains,
   is(), accepts(), acceptsEncodings(), acceptsCharsets(), acceptsLanguages(), get()]
```

## @nestjs/common

```yaml
package: "@nestjs/common"
versions_verified: "v11 documentation source (nestjs/docs.nestjs.com content/controllers.md, content/techniques/validation.md, content/pipes.md); latest 11.2.1"
docs: https://docs.nestjs.com/controllers
sources:
  # decorator -> underlying express/fastify expression. With a key argument it narrows one level.
  - access: "@Body(key?)"
    maps_to: "req.body / req.body[key]"
    taint: [sql, sql-identifier, html, shell, path, url, nosql-operator, proto]
  - access: "@Query(key?)"
    maps_to: "req.query / req.query[key]"
    taint: [sql, sql-identifier, html, shell, path, url, proto]
  - access: "@Param(key?)"
    maps_to: "req.params / req.params[key]"
    taint: [sql, sql-identifier, html, shell, path, url]
  - access: "@Headers(name?)"
    maps_to: "req.headers / req.headers[name]"
    taint: [sql, html, shell, path, url, header]
  - access: "@Req() / @Request()"
    maps_to: "req"
    taint: [sql, html, shell, path, url, header, proto]
  - access: "@Session()"   # no key argument exists
    maps_to: "req.session"
    taint: [sql, html, path, url]
  - access: "@Ip()"
    maps_to: "req.ip"
    taint: [html, log]
  - access: "@HostParam(key?)"
    maps_to: "req.hosts"
    taint: [html, url]
  - access: "@RawBody()"   # exists in v11
    maps_to: "raw body buffer"
    taint: [sql, html, shell, path]
  - access: "@UploadedFile() / @UploadedFiles()"
    taint: [path, html, shell]
    note: |
      Only populated when the matching interceptor (FileInterceptor, FilesInterceptor,
      FileFieldsInterceptor, AnyFilesInterceptor) from @nestjs/platform-express is applied.
      Client-controlled fields on Express.Multer.File: fieldname, originalname, mimetype,
      encoding, buffer. 'size' is measured, not claimed. originalname is the path-traversal
      vector. UNVERIFIED: that field list is multer's README, not NestJS documentation.
  - access: "any @Query()/@Param() typed string|number, or untyped, or any/object"
    taint: [everything]
    note: "A GLOBAL ValidationPipe does not touch these -- see the pipe notes below. This is the highest-value NestJS false-negative."
sanitizers:
  - call: "new ValidationPipe(options)"
    neutralizes: "in proportion to the class-validator decorators present on the DTO -- and nothing more"
    options_that_matter:
      whitelist: "strips properties with no validation decorator -> clears 'proto' (mass assignment)"
      forbidNonWhitelisted: "throws instead of stripping; docs say pair it with whitelist: true"
      forbidUnknownValues: "Nest OVERRIDES class-validator's true default with false"
      transform: "enables the primitive-coercion fallback"
      transformOptions: "real option, absent from the docs table; enableImplicitConversion lives HERE, not at the top level"
    footguns:
      - "A DTO with zero class-validator decorators validates NOTHING. Nest sets forbidUnknownValues: false, so a metadata-less class yields [] errors and, with default options, the pipe returns the ORIGINAL value -- extra keys and all."
      - "With whitelist: true and a decorator-less DTO the pipe strips everything -> the handler gets {}."
      - "toValidate() bails on String, Boolean, Number, Array, Object, Buffer, Date and on a nil metatype. @Query('q') q: string is never validated."
      - "Custom createParamDecorator params are skipped unless validateCustomDecorators: true."
      - "transformPrimitive runs only with transform: true, only when a key was passed (bare @Query()/@Param() are untouched), only for type 'param'|'query' (never body/headers), and uses +value -- so ?id=abc with id: number yields NaN, not a 400."
  - call: "ParseIntPipe | ParseFloatPipe | ParseBoolPipe | ParseUUIDPipe | ParseEnumPipe | ParseDatePipe"
    neutralizes: [sql, sql-identifier, html, shell, path, url, code, nosql-operator]
    why: "throws on non-conforming input; the output is a number/boolean/UUID/enum member/Date, not attacker text"
    caveat: "{ optional: true } passes nil through -- model as a bypass edge"
  - call: "ParseArrayPipe"
    neutralizes: "only if options.items is given (each item is delegated to an internal ValidationPipe); with no items it merely splits on the separator and clears nothing"
  - call: "DefaultValuePipe | ParseFilePipe"
    neutralizes: []
    why: "DefaultValuePipe substitutes nil/NaN only. ParseFilePipe (MaxFileSizeValidator, FileTypeValidator) checks metadata, never content or filename."
  - note: "There is no ParseStringPipe -- everything arrives as a string already."
```

## next

```yaml
package: next
versions_verified: "16.2.10 local type definitions (dist/server/request/{headers,cookies,search-params,params}.d.ts) + v16 documentation sources; latest 16.3.2"
docs: https://nextjs.org/docs/app/api-reference/functions/next-request
sources_app_router:
  - access: "props.searchParams"
    shape: "Promise<{ [key: string]: string | string[] | undefined }>"
    taint: [sql, sql-identifier, html, shell, path, url, proto]
    note: "SOURCE-VERIFIED as a Promise: createSearchParamsFromClient returns Promise<SearchParams>. Promise since v15.0.0-RC; sync access was v14. Client Components read it via use(searchParams). layout receives params but NOT searchParams."
  - access: "props.params"
    shape: "Promise<Record<string, string | string[] | undefined>>"
    taint: [sql, sql-identifier, html, shell, path, url]
  - access: "headers()"      # from 'next/headers'
    shape: "Promise<ReadonlyHeaders>"   # source-verified: declare function headers(): Promise<ReadonlyHeaders>
    taint: [sql, html, shell, path, url, header]
    usage: "(await headers()).get('authorization')"
  - access: "cookies()"      # from 'next/headers'
    shape: "Promise<ReadonlyRequestCookies>"   # source-verified
    taint: [sql, html, shell, path, url]
    usage: "(await cookies()).get('theme')?.value"
  - access: "draftMode()"    # from 'next/headers' -- async in v15+
    taint: []
  - access: "request.json() | request.text() | request.formData()"   # Route Handler, inherited Web Request methods
    taint: [sql, sql-identifier, html, shell, path, url, nosql-operator, proto]
  - access: "request.nextUrl.searchParams"
    taint: [sql, sql-identifier, html, shell, path, url]
  - access: "request.cookies.get(name)"    # also .getAll(), .has(); returns undefined when absent, first match when duplicated
    taint: [sql, html, shell, path, url]
  - access: "request.headers.get(name)"
    taint: [sql, html, shell, path, url, header]
  - access: "second Route Handler arg: { params }"
    shape: "{ params: Promise<...> }"      # also a Promise in v15+
    taint: [sql, sql-identifier, html, shell, path, url]
  - removed: "request.ip, request.geo -- REMOVED in v15.0.0. Any rule matching these is dead code."
sources_server_actions:
  - marker: "'use server'"
    placement: "file-level (top of module) OR inline (first statement of an async function)"
  - access: "the FormData parameter of an action used as a form action"
    taint: [sql, sql-identifier, html, shell, path, url, nosql-operator, proto]
  - note: |
      Next's own data-security guide: "when a Server Action is created and exported, it is
      reachable via a direct POST request, not just through your application's UI ... verify
      authentication and authorization inside each one." Arguments closed over or bound into an
      action are still client-supplied at the wire level -> stay tainted. Encrypted action IDs and
      dead-code elimination reduce, not remove, exposure.
sources_pages_router:
  - access: "req.query"    # NextApiRequest; also carries dynamic route params, catch-all -> array; defaults to {}
    taint: [sql, sql-identifier, html, shell, path, url, proto]
  - access: "req.body"     # parsed per content-type, or null; typed 'any' by design
    taint: [sql, sql-identifier, html, shell, path, url, nosql-operator, proto]
  - access: "req.cookies"  # defaults to {}
    taint: [sql, html, shell, path, url]
  - access: "context.query | context.params | context.resolvedUrl | context.req | context.req.cookies"   # getServerSideProps
    taint: [sql, sql-identifier, html, shell, path, url]
    note: "getServerSideProps context values are PLAIN objects, not Promises -- the opposite of App Router. Do not unify the two shapes in one registry entry."
unverified:
  - "Whether v16 removed the v15 synchronous-access fallback for params/searchParams (the page.mdx version table stops at v15.0.0-RC)."
  - "The .bind(null, id) extra-argument pattern for Server Actions is not present in use-server.mdx or the data-security guide; the docs show the inline-closure form."
```

## hono

```yaml
package: hono
versions_verified: "4.12.14 local type definitions (dist/types/request.d.ts); latest 4.13.3"
docs: https://hono.dev/docs/api/request
sources:
  - access: "c.req.query(key?)"    # method. query('q') -> string | undefined; query() -> Record<string,string>
    taint: [sql, sql-identifier, html, shell, path, url]
  - access: "c.req.queries(key?)"  # multi-value: /search?tags=A&tags=B
    taint: [sql, sql-identifier, html, shell, path, url]
  - access: "c.req.param(key?)"    # method. param('id') -> string | undefined; param() -> object of all params
    taint: [sql, sql-identifier, html, shell, path, url]
  - access: "c.req.json()"         # Promise
    taint: [sql, sql-identifier, html, shell, path, url, nosql-operator, proto]
  - access: "c.req.text()"
    taint: [sql, html, shell, path, url]
  - access: "c.req.formData()"
    taint: [sql, html, shell, path, url, proto]
  - access: "c.req.parseBody(options?)"   # multipart/form-data or x-www-form-urlencoded
    taint: [sql, html, shell, path, url, proto]
  - access: "c.req.header(name?)"  # method. header() -> Record of all headers
    taint: [sql, html, shell, path, url, header]
  - access: "c.req.raw"            # underlying Web Request
    taint: [sql, html, shell, path, url, header]
  - access: "c.req.url | c.req.path | c.req.routePath"
    taint: [path, url, html]
sanitizers:
  - call: "c.req.valid(target)"    # target: 'json' | 'query' | 'param' | 'header' | 'form' | 'cookie'
    neutralizes: "only what the validator middleware (hono/validator, @hono/zod-validator, ...) actually asserted"
    note: "valid() returns the validator's output. It is a safe-form marker ONLY when paired with a schema narrow enough to be an allowlist. Same rule as Fastify schemas."
```

# 2. Sources — browser / DOM

```yaml
package: "<browser globals>"
versions_verified: "WHATWG/DOM standard behaviour; sink list cross-checked against MDN Trusted Types API"
docs: https://developer.mozilla.org/en-US/docs/Web/API/Trusted_Types_API
sources:
  - { access: "location.search", taint: [html, js-url, sql, url, code, path, proto] }
  - access: "location.hash"
    taint: [html, js-url, sql, url, code, path, proto]
    note: "The classic DOM-XSS source: never sent to the server, so server-side WAFs never see it."
  - { access: "location.href", taint: [html, js-url, url, code, path] }
  - { access: "location.pathname", taint: [html, url, path] }
  - access: "location.host | location.hostname | location.port | location.protocol"
    taint: [html, url]
  - access: "document.URL | document.documentURI | document.baseURI"
    taint: [html, url, code]
  - { access: "document.referrer", taint: [html, url, code, log] }
  - access: "document.cookie"
    taint: [html, sql, url, code]
    note: "Readable and writable by any same-origin script; not authenticated input."
  - access: "window.name"
    taint: [html, code, url]
    note: "Survives cross-origin navigation -- a cross-origin-controlled source."
  - access: "new URLSearchParams(x).get(k) | .getAll(k) | iteration"
    taint: [html, sql, url, path, code]
    note: "URLSearchParams PARSES; it does not sanitize. Constructed from location.search it is a source, not a fix."
  - access: "new URL(x).searchParams | .pathname | .hash | .hostname"
    taint: [html, sql, url, path]
  - access: "event.data"             # in a 'message' listener; MessageEvent.data
    taint: [html, code, sql, url, proto]
    note: |
      Structured-clone payload, so it can be an object/array, not just a string. TWO separate
      findings live here: (a) the data is tainted, and (b) the handler failing to check
      event.origin (and, for ports, event.source) is its own vulnerability class -- flag the
      missing origin check independently of where the data flows.
  - access: "event.origin | event.source"   # the check, not the payload
    taint: []
  - access: "ws.onmessage -> event.data | ws.addEventListener('message', e => e.data)"
    taint: [html, code, sql, url, proto]
    note: "WebSocket frames are unvalidated remote input regardless of wss://. Same for EventSource (SSE) event.data."
  - access: "localStorage.getItem(k) | localStorage[k] | sessionStorage.getItem(k)"
    taint: [html, code, sql, url, path, proto]
    note: "Same-origin-script-writable. A stored-XSS carrier: any earlier injection persists here."
  - access: "history.state | event.state (popstate)"
    taint: [html, code, proto]
    note: "Structured clone, attacker-influenceable via pushState from injected script."
  - access: "element.value | input.value | select.value | textarea.value | form.elements[n].value"
    taint: [html, sql, shell, path, url, code]
  - access: "new FormData(form).get(k) | element.dataset.* | element.getAttribute(name)"
    taint: [html, sql, path, url]
  - access: "document.location = ... assignment target"
    note: "This is a SINK (url/js-url), not a source. See section 4."
```

---

# 3. SQL sinks

## 3.0 The tagged-template rule — read this before implementing anything

Four AST shapes, three verdicts. Getting these wrong is the difference between a shippable rule and
an unusable one.

| shape | example | verdict |
|---|---|---|
| **tagged template on a parameterizing tag** | ``prisma.$queryRaw`SELECT * FROM u WHERE id = ${id}` `` | **SAFE — never flag.** The interpolation becomes a bound parameter. |
| **call expression on an unsafe method, literal first arg** | `prisma.$queryRawUnsafe('SELECT * FROM u WHERE id = $1', id)` | **SAFE — do not flag.** Arg 0 is a static string; args 1+ are the parameter channel. |
| **call expression on an unsafe method, non-literal first arg** | ``prisma.$queryRawUnsafe(`SELECT * FROM u WHERE id = ${id}`)`` | **UNSAFE — must flag.** A `TemplateLiteral` with a non-empty `expressions` array here is exactly the false negative to avoid. |
| **raw escape hatch inside a safe tag** | ``prisma.$queryRaw`SELECT * FROM ${Prisma.raw(t)}` `` | **UNSAFE — must flag the `Prisma.raw` argument**, not the `$queryRaw` call. |

Implementation notes for the shared layer:

- Discriminate on the ESTree node type: `TaggedTemplateExpression` vs `CallExpression`. Do not
  pattern-match on the callee name alone.
- For a `CallExpression` whose arg 0 is a `TemplateLiteral`, `expressions.length === 0` is
  equivalent to a string literal (safe). `expressions.length > 0` is interpolation.
- Also treat `BinaryExpression` with `+`, `String.prototype.concat`, `Array.prototype.join`, and
  `util.format`/`sprintf` results as interpolation into arg 0.
- Every ORM in this section has an identifier-quoting helper (`sql.identifier`, `knex.ref`,
  `escapeId`, `format.ident`, `sequelize.col`). Those are the *only* safe channel for
  `sql-identifier` taint. Parameter binding cannot cover an identifier position — a rule that
  suggests "use parameters" for a dynamic `ORDER BY` column is giving wrong advice; the correct
  advice is an allowlist or the identifier-quoting helper.

## pg

```yaml
package: pg
versions_verified: "8.14.1 local source (lib/client.js:520 query(config, values, callback), lib/query.js constructor, lib/utils.js, lib/index.js); latest 8.23.0"
docs: https://node-postgres.com/features/queries
sinks:
  - call: "client.query(text, values?, callback?) | pool.query(...)"
    danger: { arg: 0 }
    taint: [sql, sql-identifier]
    safe_channel: { arg: 1, kind: "server-side bind parameters, $1..$n" }
    why_safe: "Values travel in the extended-protocol Bind message, never in the query text. Source-verified: Query.requiresPreparation() returns true when values.length > 0, so a parameterized query goes down the prepare/bind path."
    detect: "Flag when arg 0 is interpolated. Presence of arg 1 does NOT clear arg 0 -- interpolating into text and also passing values is a real and common bug."
  - call: "client.query({ text, values, name?, rowMode?, queryMode? })"
    danger: { option: text }
    taint: [sql, sql-identifier]
    safe_channel: { option: values }
    detect: "Same rule as the positional form. Object properties are read in lib/query.js: this.text = config.text; this.values = config.values."
  - call: "client.query(submittableObject)"
    note: "If arg 0 has a .submit function (e.g. pg-cursor, pg-query-stream) pg treats it as a Submittable and does not build a Query. The SQL lives inside that object -- out of scope for a shallow matcher; note as a known blind spot."
gotchas:
  - "PostgreSQL has NO identifier placeholders. $1 cannot be a table or column name. Dynamic identifiers require pg.escapeIdentifier() or an allowlist. This is not a pg limitation to work around; it is the protocol."
  - "A named query (config.name set) is always prepared and CACHED on the connection under that name. A dynamic name plus different text is a correctness bug, not directly an injection."
  - "queryMode: 'extended' forces preparation even without values."
sanitizers:
  - call: "pg.escapeIdentifier(str) | client.escapeIdentifier(str)"
    neutralizes: [sql-identifier]
    not: [html, shell, path, url]
    why: "double-quotes the identifier and doubles embedded double-quotes (lib/utils.js:168)"
  - call: "pg.escapeLiteral(str) | client.escapeLiteral(str)"
    neutralizes: [sql]
    not: [sql-identifier, html, shell, path, url]
    why: "single-quotes and escapes; last resort only -- prefer bind parameters. Correctness depends on the server's standard_conforming_strings."
```

## pg-format

```yaml
package: pg-format
versions_verified: "documentation (README); latest 1.0.4"
docs: https://github.com/datalanche/node-pg-format
sinks:
  - call: "format(fmt, ...args) | format.withArray(fmt, array)"
    danger: { arg: 0, placeholder: "%s" }
    taint: [sql, sql-identifier]
    detect: |
      The whole point of pg-format is that the placeholder chooses the escaping. Flag by placeholder,
      not by call:
        %s  -> NO escaping. Doc: "outputs a simple string". Tainted arg at a %s position is a finding.
        %I  -> identifier-escaped. Safe channel for sql-identifier.
        %L  -> literal-escaped.    Safe channel for sql (client-side escaping, not binding).
        %%  -> literal percent.
        %1$L / %2$I -> positional; the type suffix still decides.
    note: "format() returns a STRING. Its result is then passed to client.query() as arg 0, so a %s-with-taint finding surfaces one call later. The registry needs format() modelled as a propagator whose output is sql-tainted iff any tainted arg landed at %s."
sanitizers:
  - { call: "format.ident(x)",   neutralizes: [sql-identifier], not: [sql, html, shell] }
  - { call: "format.literal(x)", neutralizes: [sql],            not: [sql-identifier, html, shell] }
  - { call: "format.string(x)",  neutralizes: [],               note: "identity for SQL purposes -- explicitly NOT a sanitizer" }
```

## mysql2 / mysql

```yaml
package: mysql2
versions_verified: "mysql2 documentation + source read of lib/base/connection.js; placeholder syntax doc-verified against the mysqljs/mysql README (mysql2 is a declared drop-in). latest mysql2 3.24.1; legacy mysql reported 2.18.1 (2020, unmaintained)"
docs: https://sidorares.github.io/node-mysql2/docs
sinks:
  - call: "connection.query(sql, values?, cb?) | pool.query(...)"
    danger: { arg: 0 }
    taint: [sql, sql-identifier]
    safe_channel: { arg: 1, kind: "CLIENT-SIDE interpolation with escaping" }
    why_safe: "Only partially. Source: query() calls this.format(sql, values) before sending. The escaping is sqlstring/sql-escaper, done in-process -- correct for values, but it is string building, not binding."
  - call: "connection.execute(sql, values?, cb?) | pool.execute(...)"
    danger: { arg: 0 }
    taint: [sql, sql-identifier]
    safe_channel: { arg: 1, kind: "TRUE server-side prepared statement (COM_STMT_PREPARE + binary bind)" }
    why_safe: "Source-verified: execute() never calls format(); it builds Commands.Prepare + Commands.Execute. Values never enter the SQL text. Statements are LRU-cached (default 16000; unprepare() evicts)."
  - call: "connection.query({ sql, values, timeout }) | connection.execute({ sql, values })"
    danger: { option: sql }
    safe_channel: { option: values }
    note: "A positional arg 1 overrides options.values."
  - call: "mysql.format(sql, values) | connection.format(sql, values, namedPlaceholders)"
    danger: { arg: 0 }
    taint: [sql, sql-identifier]
    note: "Returns an interpolated SQL string -- a propagator, exactly like pg-format. Its output is sql-tainted if a tainted value reached a non-escaping position."
  - call: "mysql.raw(str) | mysql2.raw(str)"
    danger: { arg: 0 }
    taint: [sql, sql-identifier]
    why: "produces UNESCAPED SQL that survives format(); it is the deliberate escape hatch"
placeholders:
  "?":  { kind: value,      escaping: "escape() -- quoted, escaped literal" }
  "??": { kind: identifier, escaping: "escapeId() -- backtick-quoted; splits on '.' unless the second arg to escapeId is true" }
gotchas:
  - |
    THE ?? / ? DISTINCTION IS THE HIGH-VALUE FACT HERE. `?` is a value placeholder and `??` is an
    identifier placeholder. They are not interchangeable:
      query('SELECT * FROM ?? WHERE ?? = ?', ['users', 'id', id])   -- correct
      query('SELECT * FROM ? WHERE id = ?',  ['users', id])         -- emits FROM 'users' (a string
                                                                       literal, not a table) -> broken
    So a rule must not "helpfully" suggest ? for an identifier position, and must recognise ?? as a
    legitimate mitigation for sql-identifier taint.
  - |
    ?? DOES NOT WORK IN execute(). Source-derived and NOT stated in the docs: execute() has no
    client-side formatting step, so identifier placeholders are never expanded. On the prepared path,
    identifiers are unparameterizable -- allowlist only. This is a genuine trap: the same SQL string
    works under query() and silently misbehaves under execute().
  - "namedPlaceholders (:name) is a connection/pool config OR a per-call option. Converted to positional ? on the client by the named-placeholders package (the MySQL protocol has no named parameters); repeated names are sent multiple times. Passing an ARRAY of values bypasses the conversion even when the flag is on."
  - "mysql2's own doc site does not document ?, ??, escape, escapeId or format; those are inherited from mysqljs/mysql. Flagged as a documentation gap, not a behavioural uncertainty -- the source confirms them."
sanitizers:
  - call: "mysql.escape(v) | connection.escape(v) | pool.escape(v)"
    neutralizes: [sql]
    not: [sql-identifier, html, shell, path, url]
  - call: "mysql.escapeId(id, forbidQualified?) | connection.escapeId(id)"
    neutralizes: [sql-identifier]
    not: [sql, html, shell, path, url]
    note: "By default it treats '.' as a qualifier separator, so 'a.b' becomes `a`.`b`. Pass true as arg 2 to forbid that."
```

## sqlite3 (node-sqlite3)

```yaml
package: sqlite3
versions_verified: "5.1.7 local source (lib/sqlite3.js normalizeMethod, lib/sqlite3.d.ts); latest 6.0.1 -- 6.x NOT re-verified"
docs: https://github.com/TryGhost/node-sqlite3/wiki/API
sinks:
  - call: "db.run(sql, params?, cb?) | db.get(...) | db.all(...) | db.each(...) | db.map(...) | db.prepare(sql, params?, cb?)"
    danger: { arg: 0 }
    taint: [sql, sql-identifier]
    safe_channel: { arg: "1..n", kind: "bind parameters -- sqlite3_bind_*" }
    detect: |
      Source-verified overloads (all wrapped in normalizeMethod, which sniffs the trailing callback):
        run(sql, callback?)
        run(sql, params, callback?)      -- params: array | object | scalar
        run(sql, ...params)              -- variadic
      So arg 1 onward is the parameter channel in every form. db.map exists too and is easy to miss.
  - call: "db.exec(sql, cb?)"
    danger: { arg: 0 }
    taint: [sql, sql-identifier]
    safe_channel: none
    why: "CANNOT be parameterized -- the .d.ts has exactly one overload, exec(sql, callback?). It also runs MULTIPLE statements, so a ';' in the taint is a second statement, not a syntax error. Rank this above the other sqlite3 sinks."
  - call: "statement.run(params?) | statement.get(...) | statement.all(...) | statement.each(...) | statement.bind(...)"
    danger: none
    note: "The SQL was fixed at prepare() time; these carry only parameters. Not a sink."
gotchas:
  - "db.serialize()/db.parallelize() do not change the injection surface."
  - "Placeholder syntaxes are SQLite core: ?, ?NNN, :name, @name, $name."
```

## better-sqlite3

```yaml
package: better-sqlite3
versions_verified: "12.6.2 local source (lib/methods/wrappers.js, lib/methods/pragma.js) + docs/api.md; latest 13.0.3 -- 13.x NOT re-verified"
docs: https://github.com/WiseLibs/better-sqlite3/blob/master/docs/api.md
sinks:
  - call: "db.prepare(sql)"
    danger: { arg: 0 }
    taint: [sql, sql-identifier]
    safe_channel: "the resulting Statement's .run/.get/.all/.iterate/.pluck/.bind(...bindParameters)"
    detect: "Flag interpolation into prepare(). The chained .run(x) is the FIX, not the finding -- a rule that flags db.prepare('...').run(userInput) is a false positive."
  - call: "db.exec(sql)"
    danger: { arg: 0 }
    taint: [sql, sql-identifier]
    safe_channel: none
    why: 'Source: exports.exec = function exec(sql) { this[cppdb].exec(sql) }. Docs: "Unlike prepared statements, this can execute strings that contain multiple SQL statements" and it does not accept bind parameters. Highest-severity sink in this package.'
  - call: "db.pragma(source, options?)"
    danger: { arg: 0 }
    taint: [sql, sql-identifier]
    safe_channel: none
    why: "Source-verified string concatenation: this[cppdb].prepare(`PRAGMA ${source}`, this, true). Unparameterizable by construction. Rarely modelled by SAST tools -- worth having."
  - call: "db.function(name, options?, fn) | db.aggregate(name, options) | db.table(name, definition)"
    danger: { arg: 0 }
    taint: [sql-identifier]
    note: "Registers a JS callback under a SQL-visible name. The fn itself is a code-execution surface if it is built from input."
  - call: "db.loadExtension(path, entryPoint?)"
    danger: { arg: 0 }
    taint: [path, code]
    why: "loads and executes native code"
  - call: "db.unsafeMode(enabled)"
    danger: { arg: 0 }
    note: "Present in the source (lib/methods/wrappers.js) but NOT in docs/api.md. Disables safety checks; treat a truthy argument as a smell. UNVERIFIED as documented API."
gotchas:
  - "Binding syntaxes: anonymous ?, named @name / :name / $name. Anonymous and named may be mixed."
  - 'Docs are explicit: "Cannot bind SQL identifiers (table/column names)" and bind parameters cannot be used in virtual-table module arguments. Allowlist is the only answer for dynamic identifiers.'
  - "db.transaction(fn) wraps a function; it is not a SQL string sink."
```

## knex

```yaml
package: knex
versions_verified: "documentation (knexjs.org guide/raw, guide/query-builder); latest 3.3.0"
docs: https://knexjs.org/guide/raw.html
sinks:
  # every one of these has the SAME shape: SQL at arg 0, bindings at arg 1
  - call: "knex.raw(sql, bindings?)"
    danger: { arg: 0 }
    taint: [sql, sql-identifier]
    safe_channel: { arg: 1, kind: "array for positional, object for named" }
  - { call: "qb.whereRaw(sql, bindings?)",   danger: { arg: 0 }, safe_channel: { arg: 1 } }
  - { call: "qb.havingRaw(sql, bindings?)",  danger: { arg: 0 }, safe_channel: { arg: 1 } }
  - { call: "qb.joinRaw(sql, bindings?)",    danger: { arg: 0 }, safe_channel: { arg: 1 } }
  - { call: "qb.orderByRaw(sql, bindings?)", danger: { arg: 0 }, safe_channel: { arg: 1 } }
  - { call: "qb.groupByRaw(sql, bindings?)", danger: { arg: 0 }, safe_channel: { arg: 1 } }
  - note: "There is NO selectRaw. The idiom is knex.select(knex.raw(sql, bindings)) -- same indices, one level deeper."
placeholders:
  "?":       { kind: value,      escaping: "bound as a driver parameter" }
  "??":      { kind: identifier, escaping: "client-side quoted" }
  ":name":   { kind: value,      escaping: "bound as a driver parameter" }
  ":name:":  { kind: identifier, escaping: "client-side quoted -- note the TRAILING colon" }
  "\\?":     { kind: escape,     note: "literal question mark, positional form" }
  "\\:":     { kind: escape,     note: "literal colon, named form" }
gotchas:
  - "Documented example: knex.raw('?? = ?', ['user.name', 1]) -> \"user\".\"name\" = ?. Mixing up ? and ?? silently produces a string literal where a column was meant."
  - "An unresolved placeholder throws; an undefined value is not substituted."
  - 'Doc warning to cite: "Avoid interpolating raw strings for lists when values come from users."'
  - ".withSchema(name) puts name in an IDENTIFIER position -- quoted, never bound."
sanitizers:
  - call: "knex.ref(identifier)"           # chainable .withSchema(s) / .as(alias)
    neutralizes: [sql-identifier]
    not: [sql, html, shell, path, url]
    caveat: "UNVERIFIED whether ref() rejects strings containing quotes/backticks -- the docs make no such claim. Model it as identifier QUOTING, not allowlisting."
```

## sequelize

```yaml
package: sequelize
versions_verified: "v6 and v7 documentation (raw-queries, model-querying-basics); latest stable 6.37.8, v7 (@sequelize/core) still alpha"
docs: https://sequelize.org/docs/v6/core-concepts/raw-queries/
sinks:
  - call: "sequelize.query(sql, options)"
    danger: { arg: 0 }
    taint: [sql, sql-identifier]
    safe_channels:
      - { option: bind,         kind: "TRUE server-side bind parameters" }
      - { option: replacements, kind: "CLIENT-SIDE escaped interpolation" }
    the_distinction: |
      THIS IS THE SECURITY-CRITICAL PAIR IN SEQUELIZE.

      replacements -- Sequelize's own words: "Replacements are escaped and inserted into the query
        by sequelize BEFORE the query is sent to the database." Placeholders: :name with an object,
        or ? positionally with an array. The value ends up INSIDE the SQL text. Sequelize's escaping
        is dialect-aware and correct for value positions, but:
          * a replacement landing in an identifier or keyword position is still injection;
          * the surrounding template is raw SQL, so taint in the template itself is unmitigated;
          * correctness depends on Sequelize's escaper, not the database's parser.
      bind -- "bind parameters are sent to the database separately from the SQL query text, and
        'escaped' by the Database itself." Placeholders: $1, $2 with an array, or $name with an
        object; $$ is a literal $. Documented constraint: "Bind parameters cannot be SQL keywords,
        nor table or column names."

      Registry consequence: treat `bind` as a full mitigation for sql taint and NOT for
      sql-identifier taint. Treat `replacements` as a partial mitigation for sql taint (rank it
      below bind, above nothing) and as NO mitigation for sql-identifier.
  - call: "Sequelize.literal(raw) | sequelize.literal(raw)"
    danger: { arg: 0 }
    taint: [sql, sql-identifier]
    safe_channel: none
    why: 'Docs: "The content of raw will be added verbatim without quoting." The primary Sequelize sink -- and it is legal inside where clauses, attributes, order, group, having, so it hides in otherwise-structured queries.'
  - call: "Sequelize.fn(fnName, ...args)"
    danger: { arg: 0 }
    taint: [sql-identifier]
    note: "Value args are escaped; fnName is emitted as SQL."
  - call: "order / group / attributes accepting a bare string"
    danger: { arg: 0 }
    taint: [sql-identifier]
    note: "Dynamic ORDER BY is the recurring real-world case. Allowlist, or col()."
v7_delta:
  - "v7 introduces an `sql` template tag whose interpolations become parameters, plus sql.identifier(x) (quoted identifier -- safe channel), sql.list([...]) (parameterized IN list) and sql.join(...)."
  - 'v7 doc warning worth citing verbatim: "Never put parameters in strings, including postgres dollar-quoted strings, as this can very easily lead to SQL injection attacks."'
  - "v7 sql-tag mode depends on the caller: Model.insert/update/destroy use bind-parameter mode, other methods use replacement mode. An untagged string passed to sequelize.query() is still raw SQL."
  - "UNVERIFIED: v7 sql.literal() semantics (assumed unescaped, as in v6) -- not confirmed on the fetched page."
safe_forms:
  - form: "where object with Op.* symbol keys -- Op.eq, ne, gt, gte, lt, lte, in, notIn, like, between, and, or, not, is"
    neutralizes: [sql]
    why: "built structurally and escaped by Sequelize; { id: [1,2,3] } is shorthand for Op.in"
    residual_risk:
      - "an embedded literal() or raw string inside the object re-opens it"
      - "attacker-controlled KEYS are operator mass-assignment: spreading req.query into a where object lets a client supply Op-equivalent string keys. This is 'proto'/'nosql-operator'-shaped injection in a SQL ORM -- flag the spread, not the operators."
sanitizers:
  - call: "Sequelize.col(name)"
    neutralizes: [sql-identifier]
    not: [sql, html, shell]
    why: "quotes the column name"
  - call: "Sequelize.where(attr, op, logic)"
    neutralizes: [sql]
    why: "structured; escapes its operands"
```

## typeorm

```yaml
package: typeorm
versions_verified: "documentation at typeorm.io for the 1.x line; latest 1.1.0 -- 1.0 is a RECENT major after years of 0.3.x"
docs: https://typeorm.io/docs/query-builder/select-query-builder/
sinks:
  - call: "dataSource.query(sql, parameters?) | queryRunner.query(sql, parameters?) | entityManager.query(sql, parameters?)"
    danger: { arg: 0 }
    taint: [sql, sql-identifier]
    safe_channel: { arg: 1, kind: "array of driver-native parameters" }
    placeholders: "DRIVER-NATIVE, not :name -- MySQL/MariaDB/SQLite/SAP use ?, Postgres/CockroachDB $1, Oracle :1, MSSQL @1"
    note: "The dialect-dependent placeholder is a real gotcha: copying a :name query from the QueryBuilder docs into dataSource.query() silently does not parameterize. UNVERIFIED: the EntityManager.query signature is not shown on the DataSource API page, though the surface is identical."
  - call: "qb.where(condition, parameters?) | .andWhere | .orWhere | .having | .andHaving | .orHaving"
    danger: { arg: 0 }
    taint: [sql, sql-identifier]
    safe_channel: { arg: 1, kind: "object of :name parameters, converted to driver params" }
    detect: |
      TypeORM-level :name placeholders here (NOT driver-native). Array expansion is :...names with
      { names: [...] }. .where("user.name = :name", { name }) is documented shorthand for
      .where("user.name = :name").setParameter("name", name), so .setParameter / .setParameters are
      an equivalent safe channel and must be recognised as such.
      Doc warning to cite: string concatenation into these conditions "opens the code to SQL injections".
      Do not reuse one parameter name for two values.
  - call: "Raw(sqlOrCallback, parameters?)"
    danger: { arg: 0 }
    taint: [sql, sql-identifier]
    safe_channel: { arg: 1, kind: "parameters object using :name" }
    detect: |
      Three forms:
        Raw("NOW()")
        Raw((alias) => `${alias} > NOW()`)
        Raw((alias) => `${alias} > :date`, { date })
      The `alias` callback argument is supplied BY TYPEORM (the column reference) -- it is not user
      input, so a template literal interpolating only `alias` is safe. Flag interpolation of
      anything else into that template. Array form: Raw((alias) => `${alias} IN (:...titles)`, { titles }).
      Doc warning: "If you need to provide user input, you should not include the user input
      directly in your query as this may create a SQL injection vulnerability."
  - call: "qb.orderBy(sort, order?) | .addOrderBy(...)"
    danger: { arg: 0 }
    taint: [sql-identifier]
    safe_channel: none
    why: "sort is a column reference and order is 'ASC'|'DESC'; neither is parameterizable. TypeORM 1.0 added runtime orderBy-condition validation and numeric .limit() validation on Update/SoftDelete builders, but dynamic input here still needs an allowlist."
  - call: "dataSource.sql`...` | entityManager.sql`...` | repository.sql`...` | queryRunner.sql`...`"
    danger: "function-wrapped interpolation ONLY"
    taint: [sql, sql-identifier]
    detect: |
      The tag itself is SAFE: interpolations become driver params ($1 / ? / :1 / @1 per dialect).
      The escape hatch is a FUNCTION interpolation:
        sql`SELECT * FROM ${() => "dyn_table"}`     -- raw, unescaped
      Array-returning functions expand to parameter lists. Doc: "No escaping is performed on raw SQL
      inserted in this way. It is not safe to use this with values sourced from user input."
      RULE: inside a TypeORM sql tag, flag any quasi expression that is an ArrowFunctionExpression /
      FunctionExpression whose body is built from taint. Do NOT flag plain interpolations.
safe_forms:
  - call: "In([...]) and the other structured find operators -- Equal, LessThan, MoreThan, Like, Between, Not, IsNull, Any, ILike"
    neutralizes: [sql]
    why: "values become bound parameters"
removed_in_1_0:
  - "setNativeParameters() -> use setParameters()"
  - "printSql()"
  - "replacePropertyNames()"
  - "TypeORM 1.0 also switched internal schema introspection/DDL to parameterized queries and escaped identifiers."
```

## @prisma/client

```yaml
package: "@prisma/client"
versions_verified: "documentation (using-raw-sql/raw-queries, using-raw-sql/typedsql) + source of sql-template-tag (the Sql/raw/join semantics Prisma reuses); latest 7.9.1"
docs: https://www.prisma.io/docs/orm/prisma-client/using-raw-sql/raw-queries
safe_by_construction:
  - call: "prisma.$queryRaw`...`"
    shape: "TAGGED TEMPLATE. Signature: $queryRaw<T>(query: TemplateStringsArray | Prisma.Sql, ...values): PrismaPromise<T>"
    why_safe: 'Interpolations become parameters. Prisma: "Prisma Client escapes all variables" and "sends all queries as prepared statements".'
    detect: "A TaggedTemplateExpression on $queryRaw is NOT a finding. Flagging it is the canonical Prisma false positive."
  - call: "prisma.$executeRaw`...`"
    shape: "TAGGED TEMPLATE. Returns the affected row count."
    why_safe: same
  - call: "prisma.$queryRaw(Prisma.sql`...`) | prisma.$executeRaw(Prisma.sql`...`)"
    why_safe: "Prisma.sql is itself a parameterizing tag producing an Sql object (strings[] + values[]); the Sql object carries its values separately."
    detect: "A CallExpression on $queryRaw whose arg 0 is a TaggedTemplateExpression tagged Prisma.sql is SAFE."
  - call: "prisma.$queryRawTyped(generatedQueryFn(args))"
    why_safe: 'TypedSQL. Ordinary function call; parameters are bound through the generated function. Docs: "by using parameterized queries, you ensure type safety and protect against SQL injection vulnerabilities." Requires the typedSql preview feature. UNVERIFIED: the introducing version is not stated in the docs.'
sinks:
  - call: "prisma.$queryRawUnsafe(sql, ...values) | prisma.$executeRawUnsafe(sql, ...values)"
    danger: { arg: 0 }
    taint: [sql, sql-identifier]
    safe_channel: { arg: "1..n", kind: "driver parameters -- $1..$n on PostgreSQL, ? on MySQL" }
    why_safe: 'Docs, about passing values as extra arguments: "Prisma Client escapes all variables when they are provided in this way."'
    detect: |
      THE TWO FAILURE MODES, both must be handled:
        FALSE NEGATIVE to avoid: $queryRawUnsafe(`SELECT * FROM u WHERE id = ${id}`)
          -- CallExpression, arg 0 is a TemplateLiteral with expressions.length > 0. FLAG IT.
             Do not skip it just because the method name ends in "Unsafe" and you assumed the
             developer knew; and do not skip it because a TemplateLiteral "looks like" the safe
             tagged form. Node type is the discriminator.
        FALSE POSITIVE to avoid: $queryRawUnsafe('SELECT * FROM u WHERE id = $1', id)
          -- arg 0 is a static string, taint is in arg 1. DO NOT FLAG.
      Also flag: string concatenation, .concat(), array .join(), and any tainted identifier at arg 0.
    doc_warning: '"If you use this method with user inputs (in other words, SELECT * FROM table WHERE columnName = ${userInput}), then you open up the possibility for SQL injection attacks."'
  - call: "Prisma.raw(str)"
    danger: { arg: 0 }
    taint: [sql, sql-identifier]
    safe_channel: none
    why: 'sql-template-tag source: raw(value) "returns a Sql instance with that string inserted verbatim into the final SQL. No parameterization occurs." Prisma.empty is raw("").'
    detect: |
      This is the escape hatch that defeats the safe tag:
        prisma.$queryRaw`SELECT * FROM ${Prisma.raw(table)}`   -- FLAG the Prisma.raw argument
      Report the finding at the Prisma.raw call, not at $queryRaw, so the message points at the fix.
  - call: "prisma.$runCommandRaw(command) | model.findRaw({ filter, options }) | model.aggregateRaw({ pipeline, options })"
    danger: { arg: 0 }
    taint: [nosql-operator, nosql-js]
    note: "MongoDB connector. $runCommandRaw cannot be used with find or aggregate. Taint here is operator/JS injection, not SQL."
safe_forms:
  - call: "Prisma.sql`...`"
    neutralizes: [sql]
    why: "parameterizing tag; nested Sql instances are flattened; exposes .sql (? placeholders), .text ($1) and .statement (:1)"
  - call: "Prisma.join(values, separator?, prefix?, suffix?)"
    neutralizes: [sql]
    why: "produces a parameterized list -- the correct way to write WHERE id IN (${Prisma.join(ids)}). Throws on an empty array."
  - call: "Prisma.empty"
    neutralizes: []
    note: "equals raw('') -- a conditional-fragment helper, not a sanitizer"
gotchas:
  - "Documented restrictions on the SAFE tagged form: variables cannot be used for identifiers (table/column names, SQL keywords) and cannot appear inside SQL string literals. So even $queryRaw cannot solve a dynamic table name -- Prisma.raw plus an allowlist is the only route, and it must be flagged as such."
  - "$executeRaw does not support multiple statements in one string."
  - "Passing a plain string to $queryRaw (rather than a template or an Sql) is a runtime type error, not a silent injection -- do not spend rule complexity there."
```

## drizzle-orm

```yaml
package: drizzle-orm
versions_verified: "0.44.7 local source (sql/sql.js, sql/sql.d.ts, pg-core/db.d.ts, sqlite-core/db.d.ts); latest 0.45.2 -- pre-1.0, minors are breaking"
docs: https://orm.drizzle.team/docs/sql
safe_by_construction:
  - call: "sql`...`"
    shape: "TAGGED TEMPLATE. Source: function sql(strings, ...params) pushes a StringChunk for each literal and the raw param object for each interpolation."
    why_safe: |
      SOURCE-VERIFIED. Each interpolated value becomes a Param chunk; at build time
      buildQueryFromSourceParams hits `if (is(chunk, Param))` and returns
      { sql: escapeParam(paramStartIndex.value++, mappedValue), params: [mappedValue] }.
      escapeParam emits $1 / ? per dialect and the value goes in the params array -- true binding.
      A non-Param, non-SQL chunk falls through to the same escapeParam path.
    detect: "A TaggedTemplateExpression tagged `sql` is NOT a finding. Same false positive as Prisma's $queryRaw."
sinks:
  - call: "sql.raw(str)"
    danger: { arg: 0 }
    taint: [sql, sql-identifier]
    safe_channel: none
    why: "SOURCE-VERIFIED: function raw(str) { return new SQL([new StringChunk(str)]) }. A StringChunk is concatenated into the query text verbatim -- no escaping, no binding."
    detect: |
      Flag interpolation into sql.raw, including the nested form:
        sql`SELECT * FROM ${sql.raw(table)}`      -- flag the sql.raw argument
        db.execute(sql.raw(`SELECT ... ${x}`))    -- flag the sql.raw argument
      Report at the sql.raw call so the message points at the fix.
  - call: "db.execute(query) | db.run(query) | db.all(query) | db.get(query) | db.values(query)"
    danger: { arg: 0, when: "arg 0 is a string rather than an SQLWrapper" }
    taint: [sql, sql-identifier]
    why: "Type-verified: execute<TRow>(query: SQLWrapper | string) and run(query: SQLWrapper | string). The string overload accepts raw SQL with no parameter channel at all."
    detect: "Flag when arg 0 is a string/template/concatenation. Do NOT flag when arg 0 is an sql`...` tagged template."
  - call: "sqlObject.inlineParams()"
    danger: { receiver: "the SQL object" }
    taint: [sql]
    why: |
      SOURCE-VERIFIED downgrade. With inlineParams set, the Param branch takes
      `if (inlineParams) return { sql: this.mapInlineParam(mappedValue, config), params: [] }`
      -- mapInlineParam calls escapeString() for strings. That converts true binding into
      client-side escaping. Not verbatim injection, but a strict reduction in safety and an
      easy-to-miss modifier on an otherwise-safe sql`` template.
safe_forms:
  - call: "sql.identifier(value)"
    neutralizes: [sql-identifier]
    not: [sql, html, shell, path]
    why: "SOURCE-VERIFIED: returns a Name, which the builder renders through escapeName(). The correct answer for a dynamic table/column. (The deprecated free function name(value) does the same.)"
  - call: "sql.placeholder(name)"
    neutralizes: [sql]
    why: "prepared-statement placeholder; values are supplied later via .execute({ name: value }) / fillPlaceholders"
  - call: "sql.param(value, encoder?)"
    neutralizes: [sql]
    why: "explicit Param wrapper -- forces the binding path for a value the builder would otherwise treat as a chunk"
  - call: "sql.join(chunks, separator?) | sql.fromList(list) | sql.empty()"
    neutralizes: "nothing by itself -- it composes chunks; safety depends on what the chunks are. sql.join of Params is safe; sql.join of StringChunks from sql.raw is not."
gotchas:
  - "Columns, Tables, Views, Subqueries and pg enums interpolated into an sql tag render as ESCAPED IDENTIFIERS (escapeName), not parameters. That is correct and safe -- do not flag sql`select from ${usersTable}`."
  - "The query-builder API (db.select().from().where(eq(...))) never produces raw SQL. All drizzle findings route through sql.raw, the string overload of execute/run, or inlineParams."
```

## mongoose / mongodb

```yaml
package: "mongoose, mongodb"
versions_verified: "mongoose v9 documentation, mongodb manual (server 8.x); latest mongoose 9.9.3, mongodb driver 7.5.0"
docs: https://www.mongodb.com/docs/manual/reference/operator/query/where/
sinks_server_side_js:      # taint: nosql-js -- these EXECUTE JavaScript on the database server
  - call: "find({ $where: '<expr>' }) | find({ $where: function () {...} }) | query.$where(strOrFn)"
    danger: { option: "$where" }
    taint: [nosql-js, code]
    note: "Runs per document, cannot use indexes. DEPRECATED as of MongoDB 8.0 (the server logs a warning). Mongoose's query.$where(str|fn) maps straight through."
  - call: "aggregate/find with { $expr: { $function: { body, args, lang: 'js' } } }"
    danger: { option: "$function.body" }
    taint: [nosql-js, code]
    note: "Works inside find() as well as aggregation. Deprecated in MongoDB 8.0, as is $accumulator. IMPORTANT: plain $expr with ordinary aggregation operators does NOT run JS and is NOT a code sink -- do not flag $expr on its own."
  - call: "db.collection.mapReduce(map, reduce, options) with a finalize function"
    danger: { arg: 0, arg2: 1, option: finalize }
    taint: [nosql-js, code]
    note: "Deprecated since MongoDB 5.0 in favour of the aggregation pipeline."
  - removed: "db.eval() / the eval command was REMOVED in MongoDB 4.2 (deprecated since 3.0). SEMI-VERIFIED: confirmed from search snippets of the 4.2 compatibility notes; the page itself did not render. Registering it risks nothing but is unlikely to fire."
sinks_operator_injection:  # taint: nosql-operator -- no JS execution, but query semantics are subverted
  - call: "Model.find(req.body) | Model.findOne({ field: req.query.x }) | updateOne(filter, req.body) | deleteMany(req.body)"
    danger: { arg: 0 }
    taint: [nosql-operator]
    why: |
      An untyped user object can carry $ne, $gt, $regex, $in, $exists, $nin. The canonical auth
      bypass is { username: 'admin', password: { $ne: null } }. Mongoose CASTING DOES NOT STRIP
      OPERATORS -- casting is about types, not shapes.
    detect: "Flag a request-derived object reaching a filter position without sanitizeFilter, a schema parse, or an explicit per-field pick. A whole-object spread into a filter is the signal."
  - call: "update / $set with a request-derived object"
    taint: [proto, nosql-operator]
    note: "Mass assignment: the same object shape problem, on the write side."
sanitizers:
  - call: "mongoose.sanitizeFilter(filter)"
    neutralizes: [nosql-operator]
    not: [nosql-js, html, sql, shell]
    why: 'wraps nested objects whose properties start with $ in an $eq: { pwd: { $ne: null } } becomes { pwd: { $eq: { $ne: null } } }'
  - option: "sanitizeFilter: true"
    where: "query.setOptions({ sanitizeFilter: true }) or mongoose.set('sanitizeFilter', true)"
    neutralizes: [nosql-operator]
    note: "DEFAULT IS false. Its absence is the normal state, so a rule cannot assume it."
  - call: "mongoose.trusted(obj)"
    neutralizes: []
    danger: true
    why: "marks an object as EXEMPT from sanitizeFilter so deliberate operators survive. trusted() wrapped around anything request-derived defeats the protection -- treat it as an unsafe-cast marker, the Mongoose equivalent of dangerouslySetInnerHTML."
  - option: "strictQuery"
    neutralizes: [proto]
    not: [nosql-operator]
    why: "strips (or with 'throw', rejects) filter properties absent from the schema. DEFAULT false since Mongoose 7. It filters unknown PATHS, not $-operators on known paths -- so it is not an operator-injection defence. Do not credit it as one."
  - call: "express-mongo-sanitize middleware"
    neutralizes: [nosql-operator]
    why: 'removes or substitutes keys that "begin with a $ sign or contain a ." in req.body, req.query, req.params, req.headers'
    options: "replaceWith, allowDots, onSanitize({ req, key }), dryRun"
    footgun: "dryRun: true performs NO sanitization. UNVERIFIED: maintenance status and Express 5 req.query-immutability compatibility."
  - note: "Mongoose 9's stronger QueryFilter TypeScript type is COMPILE-TIME ONLY. It has no runtime effect and clears no taint."
```

---

# 4. Other sinks

## node:child_process

```yaml
package: "node:child_process"
versions_verified: "nodejs.org/api/child_process.html; runtime Node v24.15.0"
docs: https://nodejs.org/api/child_process.html
sinks:
  - call: "exec(command, options?, callback?)"
    danger: { arg: 0 }
    taint: [shell]
    safe_channel: none
    shell: "ALWAYS -- /bin/sh on Unix, process.env.ComSpec on Windows"
    doc_warning: '"Never pass unsanitized user input to this function. Any input containing shell metacharacters may be used to trigger arbitrary command execution."'
  - call: "execSync(command, options?)"
    danger: { arg: 0 }
    taint: [shell]
    shell: ALWAYS
  - call: "execFile(file, args?, options?, callback?) | execFileSync(file, args?, options?)"
    danger: { arg: 0, conditional: { arg: 1, option: "shell" } }
    taint: [shell, argv]
    default: "shell: false -> NO shell. arg 0 is an executable path (path/argv taint, not shell); arg 1 is an argv array that is NOT shell-interpreted."
    escalates_when: "options.shell is truthy -> arg 0 becomes a shell command line and the doc warning applies verbatim: \"If the shell option is enabled, do not pass unsanitized user input to this function.\""
  - call: "spawn(command, args?, options?) | spawnSync(command, args?, options?)"
    danger: { arg: 0, conditional: { option: "shell" } }
    taint: [shell, argv]
    default: "shell: false -> safe from metacharacters"
    escalates_when: "options.shell truthy -> behaves like exec()"
  - call: "fork(modulePath, args?, options?)"
    danger: { arg: 0 }
    taint: [path, code]
    note: "The shell option is NOT supported by fork(). arg 0 selects a module to execute -- path/code taint, never shell."
detection_rules:
  - |
    THE sh -c PATTERN. spawn('sh', ['-c', userInput]) and spawn('/bin/bash', ['-lc', cmd]) reach a
    shell with shell: false, so a rule keyed only on options.shell misses them entirely. Flag when
    arg 0 resolves to sh, bash, zsh, dash, ash, ksh, csh, cmd, cmd.exe, powershell, pwsh, env
    (as in env sh -c) AND the args array contains -c / -Command / /c / /k with taint after it.
  - |
    ARGV INJECTION IS NOT SHELL INJECTION -- and it is not nothing. execFile('git', ['log', userArg])
    cannot spawn a subshell, but a userArg of '--output=/etc/cron.d/x' or '--upload-pack=...' can
    still be damaging. Register it as 'argv' taint at a lower severity, and only where the target
    binary is known to have dangerous flags. Blanket-flagging every execFile args array is the
    fastest way to make the rule uninstallable.
  - "options.env and options.cwd built from taint are separate, lower-severity findings (environment/path control)."
  - "As of Node 23.11/22.15, passing args together with shell: true is deprecated -- worth surfacing as a smell."
  - "Windows-specific: .bat/.cmd cannot be launched by execFile without a shell, which pushes developers toward exec() or shell: true. Expect the unsafe shape more often in cross-platform code."
```

## node:fs and node:fs/promises

```yaml
package: "node:fs, node:fs/promises"
versions_verified: "runtime introspection on Node v24.15.0 (every name below confirmed present)"
docs: https://nodejs.org/api/fs.html
sinks:
  # path at arg 0. Each has *Sync and a fs/promises counterpart unless noted.
  - call: "readFile | writeFile | appendFile | open | opendir | unlink | readdir | rm | rmdir | mkdir | stat | lstat | realpath | truncate | access | chmod | chown | watch | readlink | glob"
    danger: { arg: 0 }
    taint: [path]
    variants: "fs.X (callback), fs.XSync, fsPromises.X -- all three shapes exist for every name above"
  - call: "createReadStream(path, options?) | createWriteStream(path, options?)"
    danger: { arg: 0 }
    taint: [path]
    note: "These exist ONLY on fs, NOT on fs/promises (runtime-confirmed). A registry entry under fs/promises for them would never match."
  - call: "rename(oldPath, newPath) | copyFile(src, dest) | cp(src, dest) | link(existingPath, newPath) | symlink(target, path)"
    danger: { arg: 0, and: { arg: 1 } }
    taint: [path]
    note: "BOTH arguments are paths. A rule checking only arg 0 misses half of these. symlink is inverted relative to the others: arg 0 is the target, arg 1 is the link location."
  - call: "writeFile(file, data, ...) | appendFile(file, data, ...)"
    danger: { arg: 0 }
    secondary: { arg: 1, taint: "content, not path -- relevant for log/HTML injection into a served file, not traversal" }
  - call: "fs.promises.open(path, flags, mode) -> FileHandle"
    note: "The FileHandle methods carry no path; the sink is the open() call."
detection_rules:
  - "Taint kind is 'path'. An HTML escaper or a SQL escaper on a path argument is not a mitigation -- this is the clearest kind-mismatch case in the whole registry."
  - "path.join(base, taint) does NOT prevent traversal: join normalizes, so '../..' still climbs. Only resolve-plus-prefix-check does. See section 5."
  - "A null byte no longer truncates paths in modern Node (it throws), so '%00' tricks are not the current risk; '..' segments, absolute paths, and symlinks are."
```

## Code evaluation

```yaml
package: "eval, Function, node:vm, timers"
versions_verified: "nodejs.org/api/vm.html; MDN Trusted Types sink list"
sinks:
  - call: "eval(code)"
    danger: { arg: 0 }
    taint: [code]
    note: "Direct eval also exposes the calling scope; indirect eval ((0,eval)(x)) runs in global scope. Both are sinks."
  - call: "new Function(...args, body) | Function(...)"
    danger: { arg: "LAST" }
    taint: [code]
    note: "The DANGEROUS ARGUMENT IS THE LAST ONE, not the first -- earlier arguments are parameter names (which are also injectable). AsyncFunction, GeneratorFunction and AsyncGeneratorFunction constructors are equally sinks (MDN Trusted Types list)."
  - call: "setTimeout(code, delay) | setInterval(code, delay)"
    danger: { arg: 0, when: "arg 0 is a string rather than a function" }
    taint: [code]
    note: "MDN Trusted Types names the code argument as index 0 for both. In Node these do NOT accept a string; this is browser/worker-only. Scope the rule accordingly or it fires wrongly on Node code."
  - call: "vm.runInThisContext(code, options?) | vm.runInNewContext(code, contextObject?, options?) | vm.runInContext(code, contextifiedObject, options?) | new vm.Script(code, options?) | vm.compileFunction(code, params?, options?) | new vm.SourceTextModule(code, options?)"
    danger: { arg: 0 }
    taint: [code]
    doc_warning: '"The node:vm module is not a security mechanism. Do not use it to run untrusted code."'
    note: "script.runInContext / runInNewContext / runInThisContext take NO code argument -- the code was fixed at Script construction. Do not register them as sinks; the finding belongs at new vm.Script()."
  - call: "require(taint) | import(taint) | fork(taint) | worker_threads Worker(taint) | new Worker(url) | importScripts(url) | ServiceWorkerContainer.register(url)"
    danger: { arg: 0 }
    taint: [code, path]
    note: "Worker and SharedWorker: url is argument index 0 (MDN)."
  - call: "process.binding | module.constructor._load | Object.getPrototypeOf(...).constructor('...')"
    note: "Sandbox-escape idioms. Worth an entry only if the plugin ever aims at vm-escape detection; otherwise noise."
```

## DOM XSS sinks

```yaml
package: "<browser DOM>"
versions_verified: "MDN Trusted Types API injection-sink list (authoritative enumeration of what the browser itself treats as a sink)"
docs: https://developer.mozilla.org/en-US/docs/Web/API/Trusted_Types_API
sinks_html:          # TrustedHTML sinks -- taint: html
  - { property: "Element.innerHTML" }
  - { property: "Element.outerHTML" }
  - { property: "ShadowRoot.innerHTML" }
  - { call: "Element.insertAdjacentHTML(position, text)", danger: { arg: 1 }, note: "ARG 1, NOT ARG 0. Arg 0 is the position keyword." }
  - { call: "Element.setHTMLUnsafe(html)", danger: { arg: 0 } }
  - { call: "ShadowRoot.setHTMLUnsafe(html)", danger: { arg: 0 } }
  - { call: "Document.write(markup)", danger: { arg: 0 } }
  - { call: "Document.writeln(markup)", danger: { arg: 0 } }
  - { call: "Document.parseHTMLUnsafe(html)", danger: { arg: 0 } }
  - { call: "DOMParser.parseFromString(str, mimeType)", danger: { arg: 0 } }
  - { call: "Range.createContextualFragment(tagString)", danger: { arg: 0 } }
  - { call: "Document.execCommand('insertHTML', showUI, value)", danger: { arg: 2 }, note: "only for the insertHTML command" }
  - { property: "HTMLIFrameElement.srcdoc" }
  - note: "Element.setHTML(html, { sanitizer }) is the SANITIZING counterpart of setHTMLUnsafe -- it is not a sink. Do not conflate the two names."
sinks_script:        # TrustedScript sinks -- taint: code
  - { property: "HTMLScriptElement.text | .textContent | .innerText" }
  - { call: "Element.setAttribute(name, value)", danger: { arg: 1 }, note: "ARG 1 is the value. Also a finding when ARG 0 is tainted, because a tainted attribute NAME can produce an on* handler -- two distinct findings on one call." }
  - { call: "Element.setAttributeNS(ns, name, value)", danger: { arg: 2 } }
  - { call: "eval | Function | setTimeout | setInterval" , see: "Code evaluation above" }
sinks_script_url:    # TrustedScriptURL sinks -- taint: url + code
  - { property: "HTMLScriptElement.src" }
  - { property: "SVGAnimatedString.baseVal" }
  - { call: "WorkerGlobalScope.importScripts(...urls)", danger: { arg: "all" } }
  - { call: "new Worker(url) | new SharedWorker(url)", danger: { arg: 0 } }
  - { call: "ServiceWorkerContainer.register(scriptURL, options?)", danger: { arg: 0 } }
sinks_url:           # taint: js-url / url -- javascript: and data: schemes
  - { property: "a.href | area.href | form.action | button.formaction | iframe.src | embed.src | object.data | base.href" }
  - property: "location | location.href | location.assign() | location.replace() | window.open()"
    note: "location assignment is both an open-redirect (url) and a javascript:-execution (js-url) sink."
gotchas:
  - "element.textContent and element.innerText are NOT sinks -- they are the safe alternative. A rule that flags textContent is noise."
  - "jQuery: $(taintedString) parses HTML when the string starts with '<'; .html(x), .append/.prepend/.after/.before/.replaceWith/.wrap with markup, and $.globalEval are all html/code sinks. jQuery is not in this repo's dependency set, but consumer projects will have it."
  - "Trusted Types enforcement (require-trusted-types-for 'script') is the platform-level mitigation. Its presence in a CSP is the strongest possible 'safe form' signal, but it is a header, not something an ESLint rule can see."
```

## React / Vue / Angular HTML sinks

```yaml
package: react
versions_verified: "stable public API (unchanged through React 19)"
sinks:
  - call: "<X dangerouslySetInnerHTML={{ __html: value }} />"
    danger: { property: "__html" }
    taint: [html]
    detect: "Match the JSX attribute, then the __html property of the object expression. The value is the taint carrier; the wrapper object is the marker."
  - note: "React escapes text children automatically. href={taint} is still a js-url sink -- React does not block javascript: URLs (it warns in development for some versions but renders them)."
  - note: "ref-based direct DOM access (ref.current.innerHTML = x) escapes React entirely and lands in the DOM sinks above."
```

```yaml
package: vue
versions_verified: "Vue 3 documentation (api/built-in-directives, guide/best-practices/security)"
docs: https://vuejs.org/guide/best-practices/security.html
sinks:
  - call: 'v-html="expr"'
    danger: { directive_value: true }
    taint: [html]
    doc_warning: '"Dynamically rendering arbitrary HTML on your website can be very dangerous because it can easily lead to XSS attacks. Only use v-html on trusted content and never on user-provided content."'
  - call: "h('div', { innerHTML: value })"
    danger: { option: innerHTML }
    taint: [html]
    note: "OFFICIALLY DOCUMENTED as the same sink as v-html, in the security guide's HTML Injection section. Equal weight."
  - call: "<div innerHTML={value} /> (JSX) | :innerHTML / v-bind:innerHTML"
    danger: { property: innerHTML }
    taint: [html]
  - call: "component template built from a string -- template option, runtime compile(), app.config.compilerOptions"
    danger: { arg: 0 }
    taint: [template, code]
    doc_warning: |
      Vue's Rule No. 1, verbatim: "The most fundamental security rule when using Vue is never use
      non-trusted content as your component template. Doing so is equivalent to allowing arbitrary
      JavaScript execution in your application - and worse, could lead to server breaches if the code
      is executed during server-side rendering."
    note: "UNVERIFIED as an API-page entry: there is no compile() heading in Vue 3's api/general.md. Justify the sink from Rule No. 1, not from a compile() reference page."
  - call: '<a :href="userProvidedUrl">'
    taint: [js-url]
    doc_warning: '"User-provided URLs should always be sanitized by your backend before even being saved to a database."'
  - note: "Vue prevents rendering <style> tags inside templates, and 'strongly discourage[s] ever rendering a <script> element with Vue'. Interpolation and dynamic attribute bindings ARE auto-escaped."
  - unverified: "<component :is> is NOT named as a sink in Vue's security guide. Attacker-controlled `is` is component/tag confusion; do not cite the docs for an XSS claim there. domProps does not exist in Vue 3 (absence, not a documented removal)."
```

```yaml
package: "@angular/platform-browser"
versions_verified: "angular.dev API reference for DomSanitizer + angular.dev/best-practices/security"
docs: https://angular.dev/best-practices/security
sinks:
  - call: "sanitizer.bypassSecurityTrustHtml(value)"
    danger: { arg: 0 }
    taint: [html]
  - call: "sanitizer.bypassSecurityTrustScript(value)"
    danger: { arg: 0 }
    taint: [code]
  - call: "sanitizer.bypassSecurityTrustStyle(value)"
    danger: { arg: 0 }
    taint: [html]
  - call: "sanitizer.bypassSecurityTrustUrl(value)"
    danger: { arg: 0 }
    taint: [js-url]
  - call: "sanitizer.bypassSecurityTrustResourceUrl(value)"
    danger: { arg: 0 }
    taint: [url, code]
    note: "The most dangerous of the five: RESOURCE_URL has NO sanitizer at all, so this bypass is the only way to bind <iframe src> / <script src> -- and it is unavoidable, which makes 'use the sanitizer instead' bad advice here. The correct advice is an allowlist of URLs."
doc_warning: 'All five carry the identical warning: "WARNING: calling this method with untrusted user data exposes your application to XSS security risks!"'
signatures: |
    abstract sanitize(context: SecurityContext, value: SafeValue | string | null): string | null
    abstract bypassSecurityTrustHtml(value: string): SafeHtml
    abstract bypassSecurityTrustStyle(value: string): SafeStyle
    abstract bypassSecurityTrustScript(value: string): SafeScript
    abstract bypassSecurityTrustUrl(value: string): SafeUrl
    abstract bypassSecurityTrustResourceUrl(value: string): SafeResourceUrl
security_contexts: "NONE, HTML, STYLE, SCRIPT, URL, RESOURCE_URL"
safe_forms:
  - "[innerHTML] IS auto-sanitized by Angular (the docs show a script element being stripped while <b> survives). Angular's own caveat remains: binding attacker-controlled values into innerHTML 'normally causes an XSS vulnerability'."
  - "sanitizer.sanitize(SecurityContext.HTML, value) -- the sanitizing counterpart, neutralizes html."
  - |
    Trusted Types integration is official, with NAMED policies. The signal worth encoding:
    an app under TT enforcement that uses any bypassSecurityTrust* method must allow the policy
    angular#unsafe-bypass in its CSP. Other policies: angular (required), angular#unsafe-jit (JIT /
    platformBrowserDynamic), angular#unsafe-upgrade (@angular/upgrade). Related: CSP_NONCE,
    ngCspNonce, the autoCsp build option.
  - doc_warning: '"Unless you enforce Trusted Types, the built-in browser DOM APIs don''t automatically protect you from security vulnerabilities ... Avoid directly interacting with the DOM and instead use Angular templates where possible." ElementRef-based DOM access is explicitly called out.'
```

## HTTP clients (SSRF)

```yaml
package: "fetch (global / undici), axios, undici, got, node:http, node:https"
versions_verified: "axios documentation (axios.rest request-config); undici Dispatcher API docs; got documentation/2-options.md; nodejs.org/api/http.html. Latest: axios 1.19.0, undici 8.10.0, got 15.1.0"
sinks:
  - call: "fetch(input, init?)"
    danger: { arg: 0 }
    taint: [url]
    note: "arg 0 may be a string, URL or Request. init.body / init.headers built from taint are separate, lower-severity findings."
  - call: "axios(url, config?) | axios.get(url, config?) | axios.head | axios.delete | axios.options"
    danger: { arg: 0 }
    taint: [url]
  - call: "axios.post(url, data?, config?) | axios.put | axios.patch | axios.postForm | axios.putForm | axios.patchForm"
    danger: { arg: 0 }
    taint: [url]
    note: "arg 1 is the BODY, arg 2 is the config. A rule that assumes 'second arg is config' is wrong for these six."
  - call: "axios(config) | axios.request(config) | instance(config)"
    danger: { option: url, and: { option: baseURL } }
    taint: [url]
    note: |
      THE CONFIG-OBJECT FORM IS THE ONE SAST TOOLS MISS. Verified config keys: url, method, baseURL,
      headers, params, paramsSerializer, data, timeout, withCredentials, adapter, auth, responseType,
      proxy, maxRedirects, httpAgent, httpsAgent, transformRequest, transformResponse, validateStatus,
      allowAbsoluteUrls, maxContentLength, maxBodyLength, socketPath, allowedSocketPaths, transport,
      decompress, transitional, env, formSerializer, maxRate, xsrfCookieName, xsrfHeaderName,
      withXSRFToken, redact.
      SSRF-relevant beyond url/baseURL: proxy (redirects the whole request), maxRedirects (a
      redirect chain can leave an allowlisted host -- 0 disables following), allowAbsoluteUrls
      (whether a tainted url can override baseURL), socketPath / allowedSocketPaths (unix socket
      access), transport / adapter / httpAgent (full request interception).
  - call: "undici.request(url, options?) | undici.stream(url, options, factory) | undici.pipeline(url, options, handler) | undici.connect(url, options?) | undici.upgrade(url, options?) | undici.fetch(input, init?)"
    danger: { arg: 0 }
    taint: [url]
    note: 'Top-level undici helpers take the URL at arg 0. Docs: "Do not pass origin or path in the second options argument."'
  - call: "dispatcher.request({ origin, path, method, body, headers, query }) | new Client(origin) | new Pool(origin) | new Agent(options)"
    danger: { option: path, and: { option: origin } }
    taint: [url]
    note: "The LOW-LEVEL Dispatcher form is where `path` lives. A tainted `path` on a fixed origin is request-splitting/path-traversal-shaped rather than classic SSRF, but still a finding."
  - call: "got(url, options?) | got.get/post/put/patch/head/delete(url, options?) | got.stream(url, options?)"
    danger: { arg: 0 }
    taint: [url]
  - call: "got(options) | got.extend(options) | got.paginate(options)"
    danger: { option: url, and: { option: prefixUrl } }
    taint: [url]
    note: "Other keys that matter: followRedirect, maxRedirects, agent, dnsLookup (custom resolution defeats host allowlists), hooks (arbitrary interception), searchParams, allowGetBody."
  - call: "http.request(url, options?, cb?) | http.request(options, cb?) | http.get(...) | https.request(...) | https.get(...)"
    danger: { arg: 0 }
    taint: [url]
    note: "Both overloads exist. Target-determining option keys: host, hostname, port, path, socketPath, protocol, method, headers, agent, auth, setHost. socketPath reaches a unix socket -- the Docker-socket SSRF pivot."
detection_rules:
  - "A hostname allowlist checked BEFORE the request does not survive a redirect. maxRedirects: 0 / followRedirect: false is part of the safe form, not a nicety."
  - "DNS-rebinding and decimal/octal/IPv6-mapped IP encodings mean a string check on the URL is weaker than resolving and checking the address. A rule can reasonably require new URL(x).hostname against a literal allowlist and still be honest that this is not complete."
  - "Server-side: taint reaching a redirect (res.redirect, Location header, NextResponse.redirect) is open redirect (CWE-601), a different finding from SSRF with the same 'url' taint kind. Keep the sink lists separate."
```

## jsonwebtoken

```yaml
package: jsonwebtoken
versions_verified: "9.0.2 local source (sign.js, verify.js); latest 9.0.3"
docs: https://github.com/auth0/node-jsonwebtoken
sinks:
  - call: "jwt.sign(payload, secretOrPrivateKey, options?, callback?)"
    danger:
      - { option: algorithm, unsafe_value: "'none'" , why: "source-verified SUPPORTED_ALGS includes 'none'; with algorithm 'none' the secret may be empty (`if (!secretOrPrivateKey && options.algorithm !== 'none')`) and the token is unsigned" }
      - { option: allowInsecureKeySizes, unsafe_value: true, why: "source-verified: suppresses the `/^(?:RS|PS)/ && signature.length < 256` guard -- i.e. permits RSA keys under 2048 bits" }
      - { option: expiresIn, unsafe_value: "absent", why: "no exp claim -> a token that never expires. Default algorithm when omitted is HS256 (`alg: options.algorithm || 'HS256'`)." }
      - { arg: 1, unsafe_value: "a hardcoded string literal or a short/empty secret", taint: [secret] }
    other_options: "expiresIn, notBefore, audience, issuer, subject, jwtid, keyid, noTimestamp, header, encoding, mutatePayload"
  - call: "jwt.verify(token, secretOrPublicKey, options?, callback?)"
    danger:
      - { option: algorithms, unsafe_value: "an array containing 'none'", why: "source-verified: an unsigned token is rejected unless options.algorithms is supplied -- 'please specify \"none\" in \"algorithms\" to verify unsigned tokens'" }
      - { option: algorithms, unsafe_value: "absent", why: "NOT a vulnerability in v9, but it is implicit behaviour worth surfacing: the algorithm set is INFERRED from the key type (secret -> HS_ALGS, rsa/rsa-pss -> RSA_KEY_ALGS, ec -> EC_KEY_ALGS, else PUB_KEY_ALGS). Pinning it explicitly is the safe form." }
      - { option: ignoreExpiration, unsafe_value: true }
      - { option: ignoreNotBefore, unsafe_value: true }
      - { option: allowInvalidAsymmetricKeyTypes, unsafe_value: true, why: "skips validateAsymmetricKey(header.alg, key)" }
      - { option: allowInsecureKeySizes, unsafe_value: true }
  - call: "jwt.decode(token, options?)"
    danger: { arg: 0 }
    taint: [everything]
    why: "DOES NOT VERIFY ANYTHING. Every claim it returns is attacker-controlled. Using decode() where verify() was meant is the single most common jsonwebtoken bug -- rank it high."
version_critical:
  - |
    jsonwebtoken 9 added the algorithm-confusion mitigations that 8 lacked, source-verified in verify.js:
      * HS* algorithms require a symmetric key -- "secretOrPublicKey must be a symmetric key when using ${alg}"
      * RS*/PS*/ES* require an asymmetric PUBLIC key -- "secretOrPublicKey must be an asymmetric key when using ${alg}"
      * validateAsymmetricKey(header.alg, key) runs unless allowInvalidAsymmetricKeyTypes
      * a token with no signature is rejected when a key is provided; a signed token with no key is rejected
    The call SIGNATURE is identical in v8 and v9. A signature-matching rule cannot tell them apart.
    If the plugin ever wants to report "algorithm confusion possible", it must read the installed
    version -- otherwise the honest finding is the weaker "algorithms not pinned".
```

## jose

```yaml
package: jose
versions_verified: "6.2.2 local type definitions (dist/types/index.d.ts export list); latest 6.2.10"
docs: https://github.com/panva/jose
sinks:
  - call: "UnsecuredJWT | UnsecuredJWT.decode(jwt)"
    taint: [code, everything]
    why: "an explicitly unsecured (alg: none) JWT. Its presence in production code is the finding."
  - call: "decodeJwt(token) | decodeProtectedHeader(token)"
    danger: { arg: 0 }
    taint: [everything]
    why: "no signature verification -- same class as jwt.decode()"
  - call: "jwtVerify(jwt, key, options?) | compactVerify | flattenedVerify | generalVerify | jwtDecrypt | compactDecrypt | flattenedDecrypt | generalDecrypt"
    danger: { option: algorithms }
    note: "JWTVerifyOptions carries the algorithm allowlist. jose is safe-by-default in that it will not accept 'none' through the normal verify paths (that is what UnsecuredJWT exists for), so the finding here is 'algorithms not pinned', not 'none accepted'."
  - call: "EmbeddedJWK"
    taint: [key-confusion]
    why: "resolves the verification key from the token's own embedded JWK header. Trusting a token-supplied key is only correct in narrowly scoped protocols; otherwise it is a full verification bypass."
  - call: "createRemoteJWKSet(url, options?)"
    danger: { arg: 0 }
    taint: [url]
    why: "fetches the key set over the network -- a tainted URL means attacker-chosen keys. Also supports a customFetch override."
verified_export_surface: |
  compactDecrypt, flattenedDecrypt, generalDecrypt, GeneralEncrypt, compactVerify, flattenedVerify,
  generalVerify, jwtVerify, jwtDecrypt, CompactEncrypt, FlattenedEncrypt, CompactSign,
  FlattenedSign, GeneralSign, SignJWT, EncryptJWT, calculateJwkThumbprint,
  calculateJwkThumbprintUri, EmbeddedJWK, createLocalJWKSet, createRemoteJWKSet, jwksCache,
  customFetch, UnsecuredJWT, exportPKCS8, exportSPKI, exportJWK, importSPKI, importPKCS8,
  importX509, importJWK, decodeProtectedHeader, decodeJwt, errors
```

## node:crypto

```yaml
package: "node:crypto"
versions_verified: "nodejs.org/api/crypto.html + runtime introspection on Node v24.15.0"
docs: https://nodejs.org/api/crypto.html
sinks:
  - call: "crypto.createHash(algorithm, options?)"
    danger: { arg: 0 }
    unsafe_values: ["md5", "md4", "sha1", "ripemd160"]
    taint: [weak-hash]
    note: "Context matters and the registry should carry it: md5/sha1 for a non-security checksum or an ETag is not a vulnerability. Only a security use (integrity, signature, password) is. This is a high-false-positive rule unless it looks at the surrounding use."
  - call: "crypto.createHash('sha256').update(password)"
    taint: [weak-kdf]
    note: "A raw hash of a password -- even SHA-256 -- is the finding, not the algorithm. Correct answer: scrypt, pbkdf2 with a high iteration count, argon2 or bcrypt."
  - call: "crypto.createCipheriv(algorithm, key, iv, options?) | createDecipheriv(...)"
    danger: { arg: 0 }
    taint: [weak-cipher]
    detect: |
      THE MODE IS ENCODED IN THE ALGORITHM STRING -- parse it, do not just match 'aes':
        aes-256-ecb  -> ECB: deterministic, no diffusion across blocks. Always a finding.
        aes-256-cbc  -> unauthenticated: malleable, padding-oracle-prone. Finding unless paired with a MAC.
        aes-256-ctr  -> unauthenticated stream. Same caveat, plus catastrophic on IV reuse.
        aes-256-gcm / -ccm / -ocb / chacha20-poly1305 -> AEAD. The safe forms.
        des-*, des-ede3-*, rc4, rc2, bf-*, cast5-* -> obsolete primitives, findings regardless of mode.
      Key-length is also in the string: aes-128 vs aes-192 vs aes-256.
      options.authTagLength (bytes) applies to GCM/CCM/OCB/chacha20-poly1305. Since Node 26, a
      non-128-bit GCM tag WITHOUT an explicit authTagLength on the decipher is disallowed
      (deprecated in 22.0/20.13).
    related: "A hardcoded key or iv argument, and a zero/constant/reused IV (Buffer.alloc(16, 0)), are separate findings on the same call."
  - call: "crypto.createCipher(...) | crypto.createDecipher(...)"
    status: "REMOVED, not merely deprecated -- runtime-confirmed `typeof crypto.createCipher === 'undefined'` on Node v24.15.0. They derived the IV from the password via MD5. A rule may still want to flag them for code targeting old Node."
  - call: "Math.random()"
    taint: [weak-random]
    where: "any security context -- tokens, session ids, password resets, nonces, IVs, salts, OTPs"
    safe_alternative: "crypto.randomBytes(size, cb?), crypto.randomInt(min?, max, cb?), crypto.randomUUID(options?), crypto.getRandomValues(typedArray)"
    note: "The registry needs the security-context qualifier. Math.random() for a UI jitter or a test fixture is fine; flagging it everywhere is exactly the noise that kills adoption."
  - call: "crypto.pbkdf2(password, salt, iterations, keylen, digest, callback) | pbkdf2Sync(password, salt, iterations, keylen, digest)"
    danger: { arg: 2, name: iterations }
    detect: |
      ARGUMENT INDEX 2 IS THE ITERATION COUNT (0-based: password, salt, iterations, keylen, digest).
      Only a numeric literal can be judged statically. OWASP's current PBKDF2-HMAC-SHA256 guidance is
      600,000; PBKDF2-HMAC-SHA1 is 1,300,000. Anything in the 1,000-10,000 range is a clear finding.
      Argument 4 (digest) matters too: 'sha1' is weak here, 'sha256'/'sha512' preferred.
      NOTE: the OWASP numbers are a moving target -- keep them in the registry as data with a
      review date, never inline in a rule.
  - call: "crypto.scrypt(password, salt, keylen, options?, callback) | scryptSync(password, salt, keylen, options?)"
    danger: { option: N, and: [r, p, maxmem] }
    defaults: "N: 16384, r: 8, p: 1, maxmem: 32 MB"
    note: "Node's default N of 16384 is below current guidance (OWASP suggests N=2^17 with r=8, p=1). Explicitly lowering N is the stronger finding; relying on the default is a weaker one."
  - call: "crypto.timingSafeEqual(a, b)"
    role: "SAFE FORM, not a sink"
    requirements: "Both arguments must be Buffer/TypedArray/DataView AND THE SAME BYTE LENGTH. Unequal lengths throw TypeError('The \"buf1\" and \"buf2\" arguments must have the same length'), so a naive drop-in replacement for === turns a comparison into a crash -- and the throw itself leaks the length."
    detect: "The inverse rule is the valuable one: flag `===`, `!==` or `==` comparing a secret/token/HMAC/signature against a user-supplied value, and suggest timingSafeEqual with an explicit length guard."
  - call: "crypto.createHmac(algorithm, key, options?)"
    note: "arg 0 algorithm, arg 1 key. A hardcoded key is the finding; HMAC-SHA1 is acceptable for MAC use where plain SHA-1 is not (collision resistance is not required), so do not reuse the createHash algorithm list here."
  - call: "crypto.hash(algorithm, data, outputEncoding?)"
    note: "Present on Node v24 (runtime-confirmed). Same weak-algorithm analysis as createHash, arg 0."
```

---

# 5. Sanitizers and safe forms

**The rule for this whole section:** a sanitizer neutralizes *specific taint kinds*. Registering a
sanitizer without its kind list produces false negatives that look like clean code — the most
expensive kind of miss, because a reviewer sees `escape(x)` and stops thinking.

## dompurify

```yaml
package: dompurify
versions_verified: "3.x local source (dist/purify.cjs.js config-key enumeration, README config documentation); latest 3.4.14"
docs: https://github.com/cure53/DOMPurify
sanitizer:
  call: "DOMPurify.sanitize(dirty, config?)"
  danger_arg: 0   # arg 0 is the tainted input; the CALL is the mitigation
  neutralizes: [html]
  not: [sql, sql-identifier, shell, path, url, code, nosql-operator, header]
  also: "DOMPurify.setConfig(cfg), clearConfig(), isSupported, addHook, removeHook, removeAllHooks"
verified_defaults:
  ALLOW_ARIA_ATTR: true
  ALLOW_DATA_ATTR: true
  ALLOW_UNKNOWN_PROTOCOLS: false
  ALLOW_SELF_CLOSE_IN_ATTR: true
  SAFE_FOR_TEMPLATES: false
  SAFE_FOR_XML: true
  WHOLE_DOCUMENT: false
  FORCE_BODY: false
  RETURN_DOM: false
  RETURN_DOM_FRAGMENT: false
  RETURN_TRUSTED_TYPE: false
  SANITIZE_DOM: true
  SANITIZE_NAMED_PROPS: false
  KEEP_CONTENT: true
  IN_PLACE: false
  PARSER_MEDIA_TYPE: null
  ALLOWED_URI_REGEXP: "/^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp|matrix):|[^a-z]|[a-z+.\\-]+(?:[^a-z+.\\-:]|$))/i"
config_keys_that_weaken_safety:
  # DOMPurify's own foot-guns checklist (Attack Classes wiki section 21) -- "require a reason for every one of these"
  definite:
    - key: "ALLOWED_ATTR / ADD_ATTR containing any on* entry"
      why: 'DOMPurify''s default-attribute table: "on* (every event handler) | forbidden | Direct script execution. Never allow-list these." Treat an on-prefixed entry as a DEFINITE finding, not a warning.'
    - key: "ADD_TAGS: ['iframe'] together with ADD_ATTR: ['srcdoc']"
      why: 'DOMPurify does not recurse into srcdoc -- "<iframe srcdoc=\"<img src=x onerror=alert(1)>\"> executes"'
    - key: "ADD_TAGS: ['base']"
      why: '"A single <base href> rewrites every relative URL in the document ... Almost never allow."'
    - key: "ADD_URI_SAFE_ATTR with formaction / data / ping / imagesrcset"
      why: "forbidden by default for a reason -- README and threat model both say never re-add these"
    - key: "SAFE_FOR_XML: false"
      why: '"removes mutation-XSS protection"; README: "changing from true to false will lead to XSS in this or some other way"'
    - key: "ALLOW_UNKNOWN_PROTOCOLS: true"
      why: 'README: "allow external protocol handlers in URL attributes (default is false, be careful, XSS risk)"'
  probable:
    - key: "ALLOWED_URI_REGEXP (custom)"
      why: "two risks -- over-permissiveness, AND ReDoS: 'a catastrophically-backtracking pattern becomes an attacker-triggerable denial of service, because the attacker controls the string the regex is tested against'"
    - key: "SANITIZE_DOM: false"
      why: 'README: "disable DOM Clobbering protection on output (default is true, handle with care, minor XSS risks here)"'
    - key: "SAFE_FOR_TEMPLATES: true"
      why: 'counterintuitively on the UNSAFE list -- README: "be careful please, this mode is not recommended for production usage"; the wiki adds its own bug history (CVE-2025-26791)'
    - key: "CUSTOM_ELEMENT_HANDLING with a loose tagNameCheck/attributeNameCheck, or allowCustomizedBuiltInElements: true"
      why: 'README: "The default values are very restrictive to prevent accidental XSS bypasses. Handle with great care!"'
    - key: "WHOLE_DOCUMENT: true"
      why: "in the foot-guns list; also changes what surfaces (a top-level <style>/<template> appears in output under WHOLE_DOCUMENT)"
    - key: "ADD_DATA_URI_TAGS, NAMESPACE, PARSER_MEDIA_TYPE"
      why: "all on DOMPurify's own checklist"
  informational_only:
    - key: "FORCE_BODY: true"
      why: "described neutrally in the README and absent from BOTH wiki foot-gun lists. Do not rank it as unsafe."
    - key: "RETURN_DOM / RETURN_DOM_FRAGMENT / IN_PLACE"
      why: |
        CORRECTION TO A COMMON BELIEF, AND TO THIS DOCUMENT'S OWN BRIEF: RETURN_DOM_FRAGMENT DOES
        NOT WEAKEN SAFETY. DOMPurify's threat model presents it as the SAFER path, under "recipes
        that are safe as shown": "Skip the round-trip - return a fragment and append. Returning a
        DOM fragment instead of a string lets you insert nodes directly, which avoids the serialize
        -> reparse step entirely (and with it a whole class of mutation-XSS concerns) ... append it
        as-is and don't serialize it back to a string in between."
        The correct rule is to flag POST-SANITIZE MUTATION OR RE-SERIALIZATION of the returned node,
        not the flag. Same for RETURN_TRUSTED_TYPE, which is a safety feature.
hook_footguns:
  - "afterSanitizeElements / afterSanitizeAttributes run AFTER validation and their output is NOT re-checked. A hook doing node.setAttribute('href', 'javascript:...') there re-introduces a removed payload. Attacker-influenced values belong in uponSanitize* hooks, which run before validation."
  - "Prefer data.keepAttr over data.allowedAttributes[name] = true -- the latter 'has repeatedly been the source of cross-call / cross-element leaks'."
  - "sanitize() is NOT re-entrant: 'Please do not call it from inside a hook.'"
  - "setConfig() makes per-call config INERT -- after setConfig(), options passed to sanitize() are ignored by design, including a per-call FORBID_ATTR."
  - "Hook names: beforeSanitizeElements, uponSanitizeElement, afterSanitizeElements, beforeSanitizeAttributes, uponSanitizeAttribute, afterSanitizeAttributes, beforeSanitizeShadowDOM, uponSanitizeShadowNode, afterSanitizeShadowDOM."
explicit_non_goals:
  # cite these to suppress a "DOMPurify makes this safe" conclusion
  - 'Markup context flipping: "DOMPurify will NOT protect you against feeding HTML-sanitized output into a different markup context. If you sanitize HTML and then drop it into SVG, MathML, an XML document, an attribute value, or a rawtext element (<style>, <textarea>, <noscript>...), strange and exploitable things can happen. Sanitize for the exact sink you use."'
  - 'Not a CSS sanitizer: <style> is ALLOWED BY DEFAULT and "DOMPurify does not sanitize the CSS inside it". Remedy: FORBID_TAGS: ["style"].'
  - 'Does NOT stop HTML that requests external resources (tracking pixels, prefetch).'
  - 'Does NOT protect you just by being imported -- "You must actually call it on a string or node and use its return value." A sanitize() call whose result is discarded is a finding.'
  - 'Does NOT save you from script gadgets in client-side frameworks that re-enable execution from inert attributes.'
  - '"If you first sanitize HTML and then modify it afterwards, you might easily void the effects of sanitization."'
  - "SAFE_FOR_JQUERY has been REMOVED -- handled by default now."
```

## escape-html

```yaml
package: escape-html
versions_verified: "1.0.3 local source (index.js) -- SOURCE-EXACT; latest 1.0.3 (frozen)"
sanitizer:
  call: "escapeHtml(string)"
  neutralizes: [html]
  not: [sql, sql-identifier, shell, path, url, js-url, code, nosql-operator, header, template]
  escapes: 5 characters
  exact_mapping: { '"': "&quot;", "&": "&amp;", "'": "&#39;", "<": "&lt;", ">": "&gt;" }
  safe_contexts: "HTML text nodes and QUOTED attribute values"
  unsafe_contexts:
    - "UNQUOTED attribute values -- space, tab, newline, '=' and '/' are not escaped, so `<div class=ESCAPED>` is still breakable"
    - "inside <script>, <style>, or any rawtext element"
    - "URL contexts -- javascript:alert(1) passes through completely untouched, so escaping an href does nothing for js-url taint"
    - "JSON embedded in HTML, and any second interpreter (template engines)"
  note: "This is Express's own escaper. It being present in a project does not make anything safe on its own."
```

## he

```yaml
package: he
versions_verified: "1.2.0 local source (he.js regexEscape/escapeMap) -- SOURCE-EXACT; latest 1.2.0 (frozen)"
sanitizers:
  - call: "he.escape(text)"
    neutralizes: [html]
    not: [sql, sql-identifier, shell, path, url, js-url, code, header]
    escapes: 6 characters -- regexEscape = /["&'<>`]/g
    note: "One more than escape-html: it also escapes the BACKTICK, which matters for old-IE attribute parsing. Same context limits otherwise."
  - call: "he.encode(text, options?)"
    neutralizes: [html]
    conditional: |
      Only when allowUnsafeSymbols stays false (the default). Verified option defaults:
        { allowUnsafeSymbols: false, encodeEverything: false, strict: false, useNamedReferences: false }
      allowUnsafeSymbols: true DISABLES the escaping of " & ' < > ` -- source-verified at the
      `if (!allowUnsafeSymbols)` branches. Registering he.encode as a sanitizer without checking
      that option is a false negative.
  - call: "he.decode(html, options?) | he.unescape(html)"
    neutralizes: []
    danger: true
    why: "REVERSES escaping. escape -> store -> decode -> sink is a real bug pattern; treat decode as taint RE-INTRODUCTION, and propagate html taint through it."
```

## validator

```yaml
package: validator
versions_verified: "source of src/lib/escape.js on master (8 replacements, order-exact) + README; latest 13.15.35"
docs: https://github.com/validatorjs/validator.js
sanitizers:
  - call: "validator.escape(str)"
    neutralizes: [html]
    not: [sql, sql-identifier, shell, path, url, js-url, code, header, template]
    escapes: 8 characters, in this order
    exact_mapping: { "&": "&amp;", '"': "&quot;", "'": "&#x27;", "<": "&lt;", ">": "&gt;", "/": "&#x2F;", "\\": "&#x5C;", "`": "&#96;" }
    limits:
      - 'The library REMOVED its XSS filter: README says "XSS sanitization was removed from the library" and points at DOMPurify instead. validator.escape is a context-specific escaper, NOT a sanitizer.'
      - "Does not escape '=', space, tab, newline or ':' -> unquoted attribute contexts stay injectable."
      - "No protection in JS, CSS, URL or srcdoc contexts. javascript: URLs pass through."
      - "Double-escapes existing entities (&amp; -> &amp;amp;)."
  - call: "validator.unescape(str)"
    neutralizes: []
    danger: true
    why: "reverses all 8 replacements -- taint re-introduction, same as he.decode"
  - call: "validator.stripLow(input, keep_new_lines?)"
    neutralizes: [header, log]
    not: [html, sql, shell, path]
    why: 'removes characters with a numerical value < 32 and 127 -- control characters. Mitigates CRLF header/log injection and null-byte tricks. NOT an XSS mitigation.'
  - call: "validator.whitelist(input, chars)"
    neutralizes: "everything, IF the char class is genuinely narrow"
    why: "the only true allowlist primitive in the package"
    caveat: "chars goes into a RegExp, so some characters need escaping: whitelist(input, '\\\\[\\\\]')"
  - call: "validator.blacklist(input, chars)"
    neutralizes: []
    why: "denylist -- treat as NON-sanitizing on principle"
  - call: "validator.normalizeEmail(str, options?)"
    neutralizes: []
    why: 'README is explicit: "This doesn''t validate that the input is an email, if you want to validate the email use isEmail beforehand."'
  - call: "validator.trim(input, chars?)"
    neutralizes: []
validators:
  - call: "validator.isURL(str, options?)"
    neutralizes: "[url] only when options pin it down"
    defaults: "{ protocols: ['http','https','ftp'], require_tld: true, require_protocol: false, require_host: true, require_port: false, require_valid_protocol: true, allow_underscores: false, host_whitelist: false, host_blacklist: false, allow_trailing_dot: false, allow_protocol_relative_urls: false, allow_fragments: true, allow_query_components: true, disallow_auth: false, validate_length: true }"
    caveat: "require_protocol defaults to FALSE. For SSRF/open-redirect purposes a rule should require an explicit protocols list AND host_whitelist before crediting it."
  - call: "validator.isInt(str, { min, max, allow_leading_zeroes, gt, lt })"
    neutralizes: [sql, sql-identifier, shell, path, html, code]
    why: "a validated integer string cannot carry metacharacters"
  - call: "validator.isUUID(str, version?)"      # '1'..'8', 'nil', 'max', 'all', 'loose'
    neutralizes: [sql, sql-identifier, shell, path, html, code]
  - call: "validator.isAlphanumeric(str, locale?, options?)"   # locale default 'en-US'; options.ignore
    neutralizes: [sql, shell, path, html, code]
    caveat: "options.ignore re-admits whatever it names -- read it before crediting the check"
  - call: "validator.isEmail(str, options?)"
    neutralizes: []
    why: "a valid email is still html/sql tainted -- quotes and angle brackets can be legal in a local part"
import_shapes: "require('validator').isEmail(x) | import validator from 'validator' | import isEmail from 'validator/lib/isEmail' | import isEmail from 'validator/es/lib/isEmail'"
```

## Schema validators — zod, joi, yup, valibot

```yaml
package: zod
versions_verified: "4.4.3 local runtime introspection; latest 4.4.3"
sanitizers:
  - call: "schema.parse(data) | schema.parseAsync(data)"
    neutralizes: "whatever the schema actually asserts -- see the rule below"
    note: "throws on failure, so the value downstream is schema-conforming"
  - call: "schema.safeParse(data) | schema.safeParseAsync(data)"
    neutralizes: "same, BUT ONLY on the success branch"
    footgun: "safeParse returns { success, data | error }. Using result.data without checking result.success is a bypass. The rule must require the success guard."
  - call: "z.parse(schema, data) | z.safeParse(schema, data)"
    note: "top-level helpers, new in v4 (runtime-confirmed exports). v3 code uses the method form only -- both shapes are in the wild."
  - object_behaviour: "z.object() STRIPS unknown keys by default -> clears 'proto' (mass assignment). z.strictObject() throws on them; z.looseObject() passes them through and does NOT clear proto."
  - call: "z.coerce.string() | z.coerce.number()"
    neutralizes: []
    why: "coercion runs BEFORE validation. z.coerce.string() turns any object into a string via String(), which does not narrow content at all."
```

```yaml
package: joi
versions_verified: "17.13.3 local runtime introspection; latest 18.2.5 -- 18.x NOT re-verified"
sanitizers:
  - call: "schema.validate(value, options?)"
    neutralizes: "whatever the schema asserts, ON THE SUCCESS BRANCH ONLY"
    footgun: |
      JOI'S BIGGEST TRAP: validate() RETURNS { value, error } -- it does NOT throw. Code that does
      `const { value } = schema.validate(input)` and ignores `error` gets the ORIGINAL input back.
      A rule must require that `error` is checked, or that Joi.attempt() is used instead.
  - call: "schema.validateAsync(value, options?)"
    neutralizes: "same; this one DOES reject on failure"
  - call: "Joi.attempt(value, schema, message?) | Joi.assert(value, schema)"
    neutralizes: "same; these THROW on failure -- the safest shapes"
  - option: "stripUnknown: true"
    neutralizes: [proto]
  - option: "allowUnknown: true"
    neutralizes: "nothing -- it re-admits unknown keys and un-does the proto mitigation"
```

```yaml
package: yup
versions_verified: "documentation (README, master); latest 1.7.1"
sanitizers:
  - call: "schema.validate(value, options?)"
    neutralizes: "whatever the schema asserts"
    note: "ASYNCHRONOUS -- returns a Promise, rejects with ValidationError. Forgetting the await is a silent bypass."
  - call: "schema.validateSync(value, options?)"
    neutralizes: "same, but 'Synchronous validation only works if there are no configured async tests' -- an async test makes validateSync throw a PLAIN Error instead of validating"
  - call: "schema.isValid(value) | schema.isValidSync(value)"
    neutralizes: "only as a guard -- these return a boolean and do NOT return the parsed value"
  - call: "schema.validateAt(path, rootValue, options?) | validateSyncAt(...)"
    note: "the value argument is the ROOT value relative to the starting schema, not the value at the nested path"
  - call: "schema.cast(value, options?)"
    neutralizes: []
    danger: true
    why: |
      CONFIRMED: cast() DOES NOT VALIDATE. Docs: "Attempts to coerce the passed in value to a value
      that matches the schema ... Failed casts generally return null, but may also return results
      like NaN and unexpected strings." yup's architecture separates parsing 'transforms' from
      'tests' and lets you run them independently -- cast() runs only the transforms. Docs also warn
      "values are not guaranteed to be valid types in transform functions".
      CastOptions: { stripUnknown: false, assert: true, context }. assert: true checks the TYPE, not
      the schema's tests, and the docs flag assert: false: "note that the TS return type is
      inaccurate when this is false, use with caution".
  - option: "strict"
    where: "schema.strict(true) or validate(v, { strict: true })"
    note: '"Strict schemas skip coercion and transformation attempts, validating the value as is." Default false. Full Options: { strict = false, abortEarly = true, stripUnknown = false, recursive = true, context }.'
  - call: "object.stripUnknown() | object.noUnknown(onlyKnownKeys?, message?)"
    neutralizes: [proto]
    caveat: 'yup''s own warning on noUnknown: "this method performs a transform and a validation, which may produce unexpected results. For more explicit behavior use object().stripUnknown and object().exact()." Unknown keys are NOT stripped by default.'
```

```yaml
package: valibot
versions_verified: "0.31.1 local type definitions; latest 1.4.2 -- 1.0 STABILISED THE API, so 0.31 facts may not hold"
sanitizers:
  - call: "parse(schema, input, config?) | parseAsync(schema, input, config?)"
    neutralizes: "whatever the schema asserts; throws on failure"
    note: "SCHEMA-FIRST argument order -- parse(schema, input), the opposite of zod's method form. A registry entry copied from zod will read the wrong argument."
  - call: "safeParse(schema, input, config?) | safeParseAsync(...)"
    neutralizes: "success branch only -- same guard requirement as zod"
  - call: "parser(schema, config?) | safeParser(schema, config?) | parserAsync | safeParserAsync"
    note: "curried factories returning a reusable parse function -- the taint edge is at the returned function's call site, not here"
```

**The rule that applies to all four:** a schema clears taint *in proportion to what it asserts*.
`z.string()` / `Joi.string()` / `yup.string()` assert a JavaScript type and nothing else — the value
is still `html`, `sql` and `shell` tainted. Taint is cleared by *narrowing* constraints:
`z.enum([...])`, `.uuid()`, `.regex(/^[a-z0-9-]+$/)`, `z.number().int()`, `Joi.valid(...)`,
`yup.oneOf([...])`. The registry should carry two levels: **structural** (clears `proto` only) and
**narrowing** (clears the kinds the constraint makes impossible).

## URL / encoding helpers

```yaml
group: "encoding built-ins"
sanitizers:
  - call: "encodeURIComponent(str)"
    neutralizes: [url]        # specifically: query-string and path-segment component injection
    partially: [html]
    not: [sql, sql-identifier, shell, path, code, js-url, header]
    escapes_everything_except: "A-Z a-z 0-9 - _ . ! ~ * ' ( )"
    what_it_does_NOT_protect:
      - |
        NOT a javascript:-URL defence. encodeURIComponent applied to a WHOLE URL leaves the scheme
        intact when the value is used as an href, because the browser still parses the scheme:
        `href = encodeURIComponent(x)` breaks the URL, while `href = x` after "encoding" a
        sub-component does nothing about x being 'javascript:alert(1)'. Scheme checking is a
        separate, mandatory step.
      - "NOT an HTML escaper. It leaves ' ( ) ! * ~ unencoded, and does not touch & when used at the wrong level. It is safe-ish in a quoted attribute only because it removes < > \" and space."
      - "NOT a SQL escaper. %27 is not an escaped quote to a database -- it is three literal characters, and any URL-decoding step in between restores the quote."
      - "NOT a shell escaper. A shell has no URL decoder, so encoding merely mangles the argument -- and any decode step restores the metacharacters."
      - "NOT a path-traversal defence in itself: %2e%2e%2f is decoded by the web server before your code sees it, and encodeURIComponent on the way OUT does not undo taint already in the string."
      - "Double-encoding is a real bypass class: encode -> decode -> use restores the payload."
  - call: "encodeURI(str)"
    neutralizes: "less than encodeURIComponent -- it deliberately PRESERVES the reserved set ; / ? : @ & = + $ , #"
    not: [url, html, sql, shell, path, code]
    why: "Because it preserves '/', '?', '&' and ':', it cannot protect a URL COMPONENT. Using encodeURI where encodeURIComponent was needed is a distinct bug worth its own finding."
  - call: "new URL(input) | new URL(input, base)"
    neutralizes: []
    role: "PARSER, and the foundation of a real check -- not a sanitizer by itself"
    safe_form: |
      The verifiable safe pattern for url taint:
        const u = new URL(input)
        if (!['https:'].includes(u.protocol)) throw ...        // scheme allowlist
        if (!ALLOWED_HOSTS.includes(u.hostname)) throw ...     // host allowlist against LITERALS
      Both halves are required. A scheme check alone leaves SSRF; a host check alone leaves
      javascript:/data:.
    caveats:
      - "u.hostname comparison must be against literals, not a substring/endsWith test -- 'evil-example.com'.endsWith('example.com') is true, and so is a check against 'example.com.evil.tld' for naive includes()."
      - "new URL(input, base) with a tainted input can still escape base when input is absolute. Only a following hostname check saves it."
      - "Passing a hostname allowlist does not survive redirects (see the HTTP-client section) or DNS rebinding."
  - call: "URLSearchParams"
    neutralizes: []
    note: "It PARSES. Building a query with it correctly encodes the components you put in, which helps 'url' taint at the output side -- and does nothing for anything you read out of it."
```

## Path helpers

```yaml
group: "node:path"
versions_verified: "runtime introspection on Node v24.15.0; nodejs.org/api/path.html"
sanitizers:
  - call: "path.resolve(base, input) FOLLOWED BY a prefix check"
    neutralizes: [path]
    safe_form: |
      THE PREFIX CHECK IS THE MITIGATION -- resolve() alone is not.
        const root = path.resolve(BASE)
        const full = path.resolve(root, input)
        if (full !== root && !full.startsWith(root + path.sep)) throw ...
      Requirements a rule should look for:
        * the separator in the prefix test (startsWith(root) alone matches '/srv/app-evil')
        * the equality case (full === root) handled
        * ideally fs.realpath before the comparison, since a SYMLINK inside the root can point out
          of it and resolve() is purely lexical
    note: "path.resolve() on its own RESOLVES '..' -- so it happily returns a path outside base. Registering path.resolve as a sanitizer without the check is a false negative."
  - call: "path.join(base, input)"
    neutralizes: []
    danger: true
    why: "join() normalizes, which means '../..' climbs out of base. It is not a containment primitive. Also: an ABSOLUTE input makes join produce a nonsense path while resolve discards base entirely -- both are traversal."
  - call: "path.basename(input) | path.basename(input, ext)"
    neutralizes: [path]
    why: "strips every directory component, so '../../etc/passwd' becomes 'passwd'. A genuine and cheap mitigation for the 'one file in one directory' case."
    limits:
      - "Does NOT remove a leading dot, so '.env' / '.htaccess' survive."
      - "Does NOT constrain the extension, character set, or length -- combine with an allowlist for anything security-relevant."
      - "Windows: path.posix.basename does not strip backslash components. On a POSIX build, 'a\\..\\..\\b' is a single filename."
  - call: "path.normalize(input)"
    neutralizes: []
    why: "collapses '..' but does not confine -- normalize('../../x') is '../../x'"
  - call: "path.isAbsolute(input)"
    neutralizes: "a necessary sub-check, not a mitigation on its own"
```

## Coercion and allowlists

```yaml
group: "coercion / allowlist"
sanitizers:
  - call: "Number(x) | parseInt(x, 10) | parseFloat(x) | +x | Math.trunc(Number(x)) | BigInt(x)"
    neutralizes: [sql, sql-identifier, shell, path, html, code, url, nosql-operator]
    why: "a number cannot carry a quote, a semicolon, an angle bracket or a path separator. The strongest and cheapest sanitizer in this document, when the value really is numeric."
    required_guard: |
      COERCION WITHOUT A VALIDITY CHECK IS NOT A SANITIZER, because the failure value is not an error:
        Number('abc')     -> NaN         (a number -- interpolates as 'NaN')
        Number('')        -> 0           (silently valid, and often a real record id)
        Number(null)      -> 0
        Number([])        -> 0
        Number('0x10')    -> 16
        Number('1e3')     -> 1000
        parseInt('12abc') -> 12          (PREFIX PARSING -- the trailing garbage is dropped, so this
                                          never yields a metacharacter, but it also silently accepts
                                          malformed input)
        parseInt('abc')   -> NaN
        parseInt(x)       WITHOUT the radix argument -- legacy octal/hex surprises; always pass 10
      So: credit Number()/parseInt() as clearing taint ONLY when a Number.isFinite / Number.isInteger
      / !Number.isNaN guard, or a schema, follows. The value is still not *authorized* -- an IDOR is
      a numeric id used without an ownership check, and no coercion helps there.
  - call: "Boolean(x) | x === 'true'"
    neutralizes: "everything -- a boolean carries no payload"
  - form: "allowlist membership check"
    shapes: |
      if (!['asc','desc'].includes(dir)) throw ...
      const col = ({ name: 'name', date: 'created_at' })[key]; if (!col) throw ...
      const SORTS = new Set([...]); if (!SORTS.has(k)) throw ...
      switch (kind) { case 'a': ...; default: throw ... }
    neutralizes: "ALL taint kinds, unconditionally"
    why: "the resulting value is one of a set of literals written by the developer -- it is no longer attacker data in any sense"
    detect: |
      This is THE mitigation for sql-identifier, and the only one for a dynamic ORDER BY column, a
      dynamic table name, an Angular RESOURCE_URL, or a Prisma.raw / sql.raw argument. The shared
      layer should recognise:
        * Array#includes / indexOf !== -1 on an array of literals, guarding the sink
        * Set#has on a Set built from literals
        * a lookup table whose VALUES are literals (the safest form -- the tainted string is used as
          a key and never reaches the sink)
        * a switch with a throwing/returning default
      The map-lookup form is the strongest and the easiest to recognise: taint goes in as a key,
      a developer-authored literal comes out. Prefer suggesting it in rule messages.
  - form: "regex validation against an anchored, narrow pattern"
    example: "if (!/^[a-z0-9_]{1,32}$/.test(x)) throw ..."
    neutralizes: "the kinds the character class makes impossible"
    caveats:
      - "MUST be anchored at both ends. /[a-z]+/.test(x) is true for 'a; DROP TABLE'."
      - "Beware the multiline flag and '$' matching before a trailing newline."
      - "A denylist regex (/[';]/.test(x) -> reject) is NOT equivalent and should not be credited."
```

## Taint-kind mismatch matrix

The point of this table: every cell marked `NO` is a place where code *looks* defended and is not.
These are the highest-value findings the plugin can produce, because a human reviewer skips them.

| mitigation | html | sql | sql-identifier | shell | path | url / js-url | code | nosql-operator |
|---|---|---|---|---|---|---|---|---|
| `escape-html` / `he.escape` / `validator.escape` | **yes** (text + quoted attr) | NO | NO | NO | NO | NO | NO | NO |
| `DOMPurify.sanitize` | **yes** | NO | NO | NO | NO | NO | NO | NO |
| SQL bind parameters (`$1`, `?`, `bind`) | NO | **yes** | **NO** | NO | NO | NO | NO | n/a |
| `mysql.escape` / `pg.escapeLiteral` / `format.literal` | NO | yes (weaker than binding) | NO | NO | NO | NO | NO | n/a |
| `escapeId` / `escapeIdentifier` / `sql.identifier` / `knex.ref` / `format.ident` | NO | NO | **yes** | NO | NO | NO | NO | n/a |
| `encodeURIComponent` | partial (quoted attr only) | NO | NO | NO | NO | yes (component) — NOT scheme | NO | NO |
| `encodeURI` | NO | NO | NO | NO | NO | NO (preserves `/ ? & :`) | NO | NO |
| `new URL` + scheme **and** host allowlist | NO | NO | NO | NO | NO | **yes** | NO | NO |
| `path.basename` | NO | NO | NO | NO | **yes** (single dir) | NO | NO | NO |
| `path.resolve` + prefix check (+ realpath) | NO | NO | NO | NO | **yes** | NO | NO | NO |
| `path.join` | NO | NO | NO | NO | **NO** | NO | NO | NO |
| shell quoting by hand / `shell-quote` | NO | NO | NO | partial — prefer `execFile` | NO | NO | NO | NO |
| `execFile`/`spawn` argv array (no shell) | NO | NO | NO | **yes** (leaves `argv`) | NO | NO | NO | NO |
| `Number()` / `parseInt` **+ finite check** | **yes** | **yes** | **yes** | **yes** | **yes** | **yes** | **yes** | **yes** |
| allowlist / map lookup | **yes** | **yes** | **yes** | **yes** | **yes** | **yes** | **yes** | **yes** |
| schema parse, *structural only* (`z.string()`) | NO | NO | NO | NO | NO | NO | NO | **yes** (strips keys) |
| schema parse, *narrowing* (`z.enum`, `.uuid()`, anchored regex) | yes | yes | yes | yes | yes | yes | yes | yes |
| `mongoose.sanitizeFilter` / `express-mongo-sanitize` | NO | NO | NO | NO | NO | NO | NO | **yes** |
| `strictQuery` | NO | NO | NO | NO | NO | NO | NO | **NO** (paths, not operators) |
| `validator.stripLow` | NO | NO | NO | NO | NO | NO | NO | NO — but **yes** for `header` / `log` |
| `he.decode` / `validator.unescape` | **re-taints** | — | — | — | — | — | — | — |

---

# 6. Consolidated `UNVERIFIED` list

Everything the plugin should not assert until someone checks it.

| item | what was attempted |
|---|---|
| Whether Next.js **16** removed the v15 synchronous-access fallback for `params` / `searchParams` | Read `page.mdx` version history; the table stops at `v15.0.0-RC`. Local 16.2.10 type defs show `Promise` returns, which is consistent with either answer. |
| Server Action **`.bind(null, id)`** extra-argument pattern | Not present in `use-server.mdx` or the data-security guide; the docs show the inline-closure form. The taint conclusion (a bound arg is still client-supplied) is reasoning, not a citation. |
| Vue **`compile()`** as a documented API | No `compile()` heading in Vue 3's `api/general.md`. The named export exists in the full build. Justify the sink from "Rule No. 1: never use non-trusted templates". |
| Vue 3 **`domProps`** non-existence | Absence across all Vue 3 API pages, not an explicit removal statement. |
| Vue **`<component :is>`** as a security sink | Vue's security guide does not name it. Attacker-controlled `is` is tag/component confusion; do not cite the docs for an XSS claim. |
| Fastify **ajv-compiler default option object** | Docs link to `fastify/ajv-compiler#ajv-configuration`; the anchor did not resolve. Only `coerceTypes: 'array'` is doc-confirmed. |
| Fastify `request.validationError` | Not present in the Reference/Request page that was fetched. |
| **`Express.Multer.File`** field list | Taken from multer's README, not NestJS docs. Multer has no explicit warning about `originalname` traversal — that inference is reasoning. |
| **ValidationPipe defaults** other than `stopAtFirstError: false`, `errorHttpStatusCode: 400`, `errorFormat: 'list'` | Undocumented; the rest were read from `nestjs/nest@v11.2.1` source by the researcher, not by me. Treat as second-hand. |
| **`knex.ref()`** rejecting quotes/backticks | Docs make no such claim. Modelled as identifier *quoting*, not allowlisting. |
| Sequelize **v7 `sql.literal()`** semantics | Assumed unescaped, as in v6; not confirmed on the fetched page. |
| TypeORM **`EntityManager.query`** signature | Not shown on the DataSource API page; assumed identical to `dataSource.query(sql, parameters)`. |
| MongoDB **`db.eval`** removal in 4.2 | Confirmed only from search snippets of the 4.2 compatibility notes; the page itself did not render. |
| **`express-mongo-sanitize`** maintenance status and Express 5 `req.query` immutability compatibility | README says nothing; the npm page returned 403. Relevant because Express 5 made `req.query` a read-only getter and this middleware *writes* to it. |
| better-sqlite3 **`db.unsafeMode()`** | Present in local source (`lib/methods/wrappers.js`) but absent from `docs/api.md`. |
| **sqlite3 6.x** and **better-sqlite3 13.x** signatures | Verified against local 5.1.7 / 12.6.2 only. |
| **joi 18.x** | Verified against local 17.13.3 only. |
| **valibot 1.x** | Verified against local 0.31.1 only; 1.0 stabilised the API. |
| Prisma **`$queryRawTyped`** introducing version | Not stated in the TypedSQL docs. |
| **mysql2 `??` in `execute()`** | The *conclusion* (identifier placeholders do not expand on the prepared path) is derived from the source read, not from documentation. High-confidence, but not doc-backed. |

# 7. Known gaps — not researched

Named here so nobody assumes coverage: `postgres` (postgres.js, another tagged-template driver),
`kysely`, `objection`, `@planetscale/database`, `libsql`/`@libsql/client`, `oracledb`, `tedious` /
`mssql`, `cassandra-driver`, `redis` / `ioredis` (Lua `EVAL` is a real sink), `elasticsearch` /
`@elastic/elasticsearch` (query-DSL injection), `graphql` (`graphql-js` resolvers, depth/complexity),
`ldapjs` (LDAP injection), `xml2js` / `libxmljs` (XXE), `handlebars` / `ejs` / `pug` (SSTI),
`multer`'s own options, `passport` strategies, `express-session` / `cookie-session` cookie flags,
`helmet`, `cors` (`origin: true` reflection), `serialize-javascript`, `node-serialize`, `yaml`
(`load` vs `safeLoad`), `xlsx`, `sharp`/`imagemagick` shell-outs, `puppeteer`/`playwright`
(`page.evaluate`), `dotenv`, `bcrypt`/`argon2` cost factors, `speakeasy`/`otplib`.

`ldapjs`, `redis` `EVAL`, the SSTI template engines, and `cors` `origin: true` are the four most
likely to appear in real kaliber projects and should be next.
