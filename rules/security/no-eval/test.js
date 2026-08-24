const { test, merge } = require('../../../machinery/test')
const { browser } = require('globals')

const handler = code => `function handler(req, res) { ${code} }`

test('security-no-eval', merge(
  {
    // --- tainted input into vm sinks ---------------------------------------
    valid: [
      // Static literal scripts are not findings — evaluating a fixed snippet
      // is a tooling pattern, and core no-eval already owns eval().
      "require('vm').runInNewContext('1 + 1', {})",
      // Core's rules own eval; this rule deliberately does not duplicate them.
      'eval(req.query.code)',
    ],
    invalid: [
      {
        code: handler(`const { runInNewContext } = require('vm'); runInNewContext(\`process.exit(\${req.query.code})\`, {})`),
        errors: [{ messageId: 'codeInjectionQualified' }],
      },
      {
        // Member namespace form with a browser source: a direct member hop
        // keeps confidence at 0.88, above the qualification threshold.
        code: "import * as vm from 'vm'; function h() { vm.runInThisContext(location.hash) }",
        errors: [{ messageId: 'codeInjection' }],
        languageOptions: { globals: browser },
      },
      {
        // 0.75 confidence with no inexact hop to name: plain message.
        code: "import { runInContext } from 'vm'; function handler(req) { runInContext(req.body.script) }",
        errors: [{ messageId: 'codeInjection' }],
      },
    ],
  },

  {
    // --- dynamic but untainted: the downgrade tier -------------------------
    valid: [
      // Fully static value built from literals folds statically.
      "const script = 'return ' + String(2 + 2); require('vm').runInNewContext(script, {})",
    ],
    invalid: [
      {
        code: "const { compileFunction } = require('vm'); const body = config.expressionBody; compileFunction(body)",
        errors: [{ messageId: 'dynamicCode' }],
      },
    ],
  },

  {
    // --- what stays quiet ---------------------------------------------------
    valid: [
      // Unrelated methods on an unrelated receiver named vm-ish do not exist,
      // but a different module shape must not match.
      'sandbox.runInNewContext(userCode)', // bare method on unknown object: no receiver/module proof
    ],
    invalid: [],
  },
))
