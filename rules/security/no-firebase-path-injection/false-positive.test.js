const { test, merge } = require('../../../machinery/test')

const handler = code => `function handler(req, res) { ${code} }`

test('security-no-firebase-path-injection', merge(
  {
    valid: [
      'db.ref(config.staticPath).once("value")',
      // Allowlist membership over a closed, statically foldable set — the
      // remediation the rule's own message names.
      handler(`const ALLOWED = ['a', 'b']; const id = req.params.userId; if (!ALLOWED.includes(id)) return res.status(400).end(); db.ref(id).remove()`),
      // path.basename is a registered sanitizer for the shared 'path' kind.
      handler(`db.ref('users/' + path.basename(req.params.userId)).get()`),
      // Receiver name doesn't match any registered Firebase pattern.
      handler('someOtherObject.ref(req.query.x)'),
      // A filesystem sink, not a database one — no-path-traversal's rule,
      // not this one, and this rule must stay quiet on it.
      handler("fs.readFile('/data/' + req.params.file, cb)"),
    ],
    invalid: [],
  },

  { valid: [], invalid: [] },
))
