// --- Linter Environment Detection ---

/**
 * @typedef { 'eslint' | 'oxlint' } LinterName
 * @typedef { (rule: object) => any } DefineFunction
 *
 * @typedef { { name: LinterName, define: DefineFunction } } LinterEnvironment
 */

/**
 * Detects the current linter environment and returns the correct
 * `defineRule` function for it.
 * @returns {LinterEnvironment}
 */
function detectLinterEnv() {
  try {
    // 1. Try to require 'oxlint'. If it works, we're in Oxlint.
    const { defineRule } = require('oxlint');
    return {
      name: 'oxlint',
      define: defineRule,
    };
  } catch (e) {
    // 2. If it fails, we're in ESLint.
    return {
      name: 'eslint',
      // For ESLint, the "define" function is just an identity function.
      // It returns the rule object as-is, which is what ESLint expects.
      define: (rule) => rule,
    };
  }
}

// --- Public API ---

// Detect the environment *once* when this module is imported.
const linterEnv = detectLinterEnv();

/**
 * Defines a linter rule that is compatible with both ESLint and Oxlint.
 *
 * It accepts a rule definition in the standard ESLint format
 * and automatically transforms it to the correct format for the
 * linter that is currently running.
 *
 * @param {object} rule - A rule definition in standard ESLint format.
 * @param {object} rule.meta - The rule metadata (must include `messages`).
 * @param {function} rule.create - The create function.
 */
function defineCompatibleRule(rule) {
  if (linterEnv.name === 'oxlint') {
    // --- Transform to Oxlint format ---
    return linterEnv.define({
      meta: rule.meta,
      // Oxlint expects `messages` at the top level
      messages: rule.meta.messages || {},
      // Oxlint uses `createOnce`
      createOnce: rule.create,
    });
  } else {
    // --- Use standard ESLint format ---
    // `linterEnv.define` is just (rule) => rule, so this
    // returns the rule object unchanged.
    return linterEnv.define(rule);
  }
}

module.exports = { defineCompatibleRule };
