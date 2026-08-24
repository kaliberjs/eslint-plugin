const { test, merge } = require('../../../machinery/test')

const handler = code => `function handler(req, res) { ${code} }`

/**
 * Adversarial corpus for no-eval (vm module code compilation).
 *
 * Two confirmed misses are recorded here rather than fixed, because both are
 * structural properties of how every sink in the registry is matched — a
 * CallExpression's callee shape, checked directly — not something specific
 * to the vm sinks. Fixing either means teaching sinkAt to resolve indirected
 * callees for every method/module-rooted sink in the registry, which is a
 * bigger change than this verification pass is scoped to make.
 */
test('security-no-eval', merge(
  {
    valid: [
      // ADVERSARIAL MISS: extracting a sink method into its own binding
      // before calling it. sinkAt matches the CallExpression's callee shape
      // directly (an Identifier for module sinks, a MemberExpression for
      // method sinks); a reference to the method stored in a variable and
      // invoked later presents as a bare Identifier call with no sink match.
      handler(`const vm = require('vm'); const r = vm.runInThisContext; r(req.query.code)`),
      // ADVERSARIAL MISS: .call()/.apply() indirection. The invoked function
      // is a property named 'call', not 'runInThisContext' — the sink's
      // method-name pattern never sees the real target.
      handler(`const vm = require('vm'); vm.runInThisContext.call(null, req.query.code)`),
    ],
    invalid: [
      // Renamed destructure is not an evasion: the sink matches the
      // *imported* name, not the local binding.
      {
        code: handler(`const { runInThisContext: run } = require('vm'); run(req.query.code)`),
        errors: [{ messageId: 'codeInjection' }],
      },
      // A module name that only resolves to 'vm' after folding a local
      // const is still recognized — matchesModuleSink follows require()
      // through the same static-value resolution as everywhere else.
      {
        code: handler(`const modName = 'vm'; const vm = require(modName); vm.runInThisContext(req.query.code)`),
        errors: [{ messageId: 'codeInjection' }],
      },
    ],
  },

  { valid: [], invalid: [] },
))
