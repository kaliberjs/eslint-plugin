const { test, merge } = require('../../../machinery/test')

const handler = code => `function handler(req, res) { ${code} }`

test('security-no-firebase-path-injection', merge(
  {
    // --- the canonical shape, all three sinks -------------------------------
    valid: [
      // Static paths never report.
      "db.ref('static/questionnaires').once('value')",
      // path.basename is a registered sanitizer for the 'path' kind — the
      // same fix as filesystem path traversal works here too.
      handler(`db.ref('users/' + path.basename(req.params.userId)).get()`),
    ],
    invalid: [
      {
        code: handler('db.ref(`jobAlert/verificationTokens/${req.query.token}`).get()'),
        errors: [{ messageId: 'firebasePathInjectionQualified' }],
      },
      {
        code: handler('db.ref(req.params.userId + "/selection").remove()'),
        errors: [{ messageId: 'firebasePathInjectionQualified' }],
      },
      {
        // Direct member access: exact hop, plain message.
        code: handler('firestore.doc(req.params.docPath).get()'),
        errors: [{ messageId: 'firebasePathInjection' }],
      },
      {
        code: handler('database.collection(req.query.name).get()'),
        errors: [{ messageId: 'firebasePathInjection' }],
      },
    ],
  },

  {
    // --- what stays quiet ---------------------------------------------------
    valid: [
      // Untainted paths are not this rule's concern.
      'db.ref(config.staticPath).once("value")',
      // Receiver name doesn't match any registered Firebase pattern.
      handler('someOtherObject.ref(req.query.x)'),
      // A filesystem path sink, not a Firebase one — no-path-traversal's
      // territory, and this rule must stay quiet on it.
      handler("fs.readFile('/data/' + req.params.file, cb)"),
    ],
    invalid: [],
  },
))
