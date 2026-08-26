const { test, merge, handler } = require('../../../machinery/test')

/**
 * Adversarial corpus for no-firebase-path-injection.
 *
 * One miss recorded rather than fixed: a receiver bound to a renamed
 * variable (`const d = db; d.ref(x)`) is invisible to the receiver-name
 * heuristic. The same class already recorded for no-path-traversal,
 * no-open-redirect and every other method-rooted sink in the registry —
 * not new here, not fixed there either.
 */
test('security-no-firebase-path-injection', merge(
  {
    valid: [
      // ADVERSARIAL MISS: db aliased to a renamed variable.
      handler('const d = db; d.ref(req.params.userId).remove()'),
    ],
    invalid: [
      // A const alias for the whole path is not an evasion — folded
      // through the same concat/template propagation every other rule
      // built on this engine already gets for free.
      {
        code: handler(`const path = 'users/' + req.params.userId; db.ref(path).get()`),
        errors: [{ messageId: 'firebasePathInjectionQualified' }],
      },
      // Template literal interpolation, the realistic real-world shape.
      {
        code: handler('db.ref(`users/${req.params.userId}`).update({})'),
        errors: [{ messageId: 'firebasePathInjectionQualified' }],
      },
    ],
  },

  { valid: [], invalid: [] },
))
