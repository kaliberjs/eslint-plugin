const { test, merge, handler } = require('../../../machinery/test')

test('security-no-path-traversal', merge(
  {
    // --- the canonical shape, all binding forms ----------------------------
    valid: [
      // Static paths never report.
      "fs.readFile('/etc/hosts', cb)",
      // path.basename strips directory components — the registered sanitizer.
      handler(`fs.readFile('/data/' + path.basename(req.params.name), cb)`),
      // The remediation the message names: resolve-then-check.
      handler(`
        const resolved = path.resolve(BASE, req.params.file)
        if (!resolved.startsWith(BASE + path.sep)) return res.status(400).end()
        fs.readFile(resolved, cb)
      `),
    ],
    invalid: [
      {
        code: handler("const fs = require('fs'); fs.readFile('/data/' + req.params.file, cb)"),
        errors: [{ messageId: 'pathTraversalQualified' }],
      },
      {
        code: "import { readFile } from 'fs'; function handler(req){ readFile(path.join(dir, req.query.name)) }",
        errors: [{ messageId: 'pathTraversalQualified' }],
      },
      {
        code: handler("fs.promises.writeFile('/uploads/' + req.body.filename, data)"),
        errors: [{ messageId: 'pathTraversalQualified' }],
      },
      {
        // Direct member access: exact hops, plain message.
        code: handler("res.sendFile(req.params.path)"),
        errors: [{ messageId: 'pathTraversal' }],
      },
      {
        code: handler("fsp.unlink('/tmp/' + req.query.tmp)"),
        errors: [{ messageId: 'pathTraversalQualified' }],
      },
    ],
  },

  {
    // --- what stays quiet ---------------------------------------------------
    valid: [
      // Untainted paths are no-inner-html's... nobody's problem.
      "fs.readFile(config.dataPath, cb)",
      // Reading .length of a tainted value is a number.
      handler(`fs.writeFile(logPath, String(req.body.msg.length))`),
    ],
    invalid: [],
  },
))
