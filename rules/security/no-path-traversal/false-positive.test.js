const { test, merge, handler } = require('../../../machinery/test')

/**
 * False-positive corpus for no-path-traversal.
 */
test('security-no-path-traversal', merge(
  {
    valid: [
      // path.basename is the registered sanitizer for a single filename.
      handler(`fs.readFile('/data/' + path.basename(req.params.file), cb)`),
      // The resolve-then-startsWith containment guard, the remediation the
      // rule's own message names.
      handler(`const BASE='/srv/data'; const p = path.resolve(BASE, req.params.file); if (!p.startsWith(BASE + path.sep)) return res.status(400).end(); fs.readFile(p, cb)`),
      // Allowlist membership over a closed, statically foldable set.
      handler(`const ALLOWED=['a.txt','b.txt']; const f = req.params.file; if (!ALLOWED.includes(f)) return res.status(400).end(); fs.readFile('/data/'+f, cb)`),
      // Fully static path: no request data anywhere in the flow.
      'fs.readFile("/etc/hostname", cb)',
      // Config-driven, not request-driven — untainted at the source.
      handler(`fs.readFile(config.templatePath, cb)`),
    ],
    invalid: [],
  },

  { valid: [], invalid: [] },
))
