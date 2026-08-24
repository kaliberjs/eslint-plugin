const { test, merge } = require('../../../machinery/test')

const handler = code => `function handler(req, res) { ${code} }`

/**
 * Adversarial corpus for no-path-traversal.
 *
 * Two misses recorded rather than fixed, both structural properties shared
 * by every method-rooted sink in the registry:
 *
 *   - a namespace import bound to a renamed variable (`const f =
 *     require('fs')`) is invisible to the receiver-name heuristic
 *     (`/^(fs|fsp|fspromises|promises)$/i`) the same way a renamed `db` or
 *     `vm` handle is elsewhere — an accepted, documented tradeoff, not new.
 *   - `.bind()`/`.call()`/`.apply()` indirection hides the real method name
 *     from the sink match, same as the no-eval adversarial corpus.
 *
 * Fixing either means resolving indirected callees for every sink in the
 * registry, which is bigger than this verification pass.
 */
test('security-no-path-traversal', merge(
  {
    valid: [
      // ADVERSARIAL MISS: fs bound to a renamed variable.
      handler(`const f = require('fs'); f.readFile('/data/' + req.params.file, cb)`),
      // ADVERSARIAL MISS: .bind() indirection on the sink method.
      handler(`const send = res.sendFile.bind(res); send('/data/' + req.params.file)`),
    ],
    invalid: [
      // Renamed destructure of a named export is not an evasion — the
      // module-rooted sink matches the imported name, not the local one.
      {
        code: handler(`const { readFile: rf } = require('fs/promises'); rf('/data/' + req.params.file)`),
        errors: [{ messageId: 'pathTraversalQualified' }],
      },
      // Same-file helper indirection is resolved by the interprocedural-lite
      // summary, not a wall.
      {
        code: handler(`function buildPath(name){ return '/data/' + name } fs.readFile(buildPath(req.params.file), cb)`),
        errors: [{ messageId: 'pathTraversalQualified' }],
      },
      // decodeURIComponent is a registered propagator, not a sanitizer — it
      // does not launder the value.
      {
        code: handler(`fs.readFile('/data/' + decodeURIComponent(req.params.file), cb)`),
        errors: [{ messageId: 'pathTraversalQualified' }],
      },
      // Template-literal interpolation is not a barrier either.
      {
        code: handler('fs.readFile(`/data/${req.params.file}`, cb)'),
        errors: [{ messageId: 'pathTraversalQualified' }],
      },
    ],
  },

  { valid: [], invalid: [] },
))
