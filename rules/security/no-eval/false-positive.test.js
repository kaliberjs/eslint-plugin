const { test, merge } = require('../../../machinery/test')

/**
 * False-positive corpus for no-eval.
 *
 * This rule's design leaves little additional quiet surface beyond what
 * test.js already pins: every vm code-compilation sink reports *something*
 * on a non-literal argument, tainted or not (the `dynamicCode` downgrade
 * tier exists precisely so "it's not tainted today" is not read as safe).
 * There is no registered sanitizer for the 'code' kind — restructuring
 * away from dynamic evaluation is the only fix the rule accepts, which is
 * the point. What stays quiet is narrower: fully static code, and call
 * shapes that structurally are not a vm sink at all.
 */
test('security-no-eval', merge(
  {
    valid: [
      // A template literal with no interpolation folds to a constant just
      // like a plain string literal.
      'const vm = require(\'vm\'); vm.runInNewContext(`return 1 + 1`, sandbox)',
      "const vm = require('vm'); vm.compileFunction('return 1')",
      // Same method name, unrelated receiver and no vm import in scope.
      'orm.runInNewContext(config)',
      // vm.createContext is not a code-compilation entry point and is not
      // a registered sink.
      "const vm = require('vm'); vm.createContext({})",
    ],
    invalid: [],
  },

  { valid: [], invalid: [] },
))
