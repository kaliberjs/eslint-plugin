/**
 * Confidence penalties, additive.
 *
 * Additive rather than multiplicative so that *exact* hops cost literally
 * nothing: a chain of `const` aliases keeps full confidence, which is correct,
 * because we are certain about every step. Multiplicative decay would drop a
 * real eight-hop bug below threshold purely for being long.
 *
 * The bound on that is `maxHops` (default 12), not the confidence: a chain
 * longer than that is dropped outright regardless of how exact every hop was.
 * So "any number of exact hops is free" is true only up to the hop limit, and
 * the limit is a work bound doing double duty as a correctness cliff.
 *
 * These numbers are engineering judgement, not measurement. Every fixture in
 * the test corpus asserts an exact expected confidence, so changing one shows
 * up as a diff across every affected case and someone has to look at each.
 */
const PENALTY = {
  // exact — the analysis knows precisely what happened
  read: 0,
  destructure: 0,
  sanitize: 0,

  // near-exact — a small modelling assumption
  member: 0.02,
  computedMember: 0.05,
  template: 0.05,
  concat: 0.05,
  methodName: 0.05,

  // branch — one path may be safe
  ternary: 0.08,
  logical: 0.08,

  // flow-insensitivity — we may be reading a write that a later one replaced.
  // Structurally the same uncertainty as a branch (one of several possible
  // values reaches the sink), so priced the same. It was 0.15, which silently
  // dropped the most common way to build a dynamic query in Node:
  // `let where = '1=1'; if (req.query.name) where = '... ' + req.query.name`.
  // That is a complete auth bypass, and stacking 0.15 on two ordinary
  // string-building hops put it under the reporting floor with no output at all.
  multiWrite: 0.08,
}

module.exports = { PENALTY }
