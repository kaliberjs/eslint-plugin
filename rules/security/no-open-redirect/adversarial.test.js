const { test, merge, handler } = require('../../../machinery/test')

/**
 * Adversarial corpus for no-open-redirect.
 *
 * Two misses recorded rather than fixed — both are the same structural,
 * cross-rule properties already recorded for no-path-traversal and
 * no-eval: a receiver bound to a renamed variable, and .bind() indirection
 * on the sink method. A third — Koa/Hono's `ctx`/`c` parameter naming — is
 * the same recorded gap as the no-sql-injection adversarial corpus: the
 * sink already lists `ctx` as a valid receiver, but no *source* pattern
 * matches a `ctx.query` read, because sources are gated on a `req`/
 * `request` parameter name.
 *
 * One real, rule-specific fix: res.setHeader('Location', x) required the
 * header name to be an inline string literal, so a shared header-name
 * constant was invisible. Fixed with getStaticValue, the same static-value
 * folding every other literal check in this codebase already uses.
 */
test('security-no-open-redirect', merge(
  {
    valid: [
      // ADVERSARIAL MISS: res aliased to a renamed variable before the
      // sink method is called on it.
      handler(`const r = res; r.redirect(req.query.next)`),
      // ADVERSARIAL MISS: .bind() indirection.
      handler(`const send = res.redirect.bind(res); send(req.query.next)`),
      // ADVERSARIAL MISS: Koa/Hono ctx parameter — the sink matches ctx,
      // but no source matches a read off it.
      `async function mw(ctx) { ctx.redirect(ctx.query.next) }`,
    ],
    invalid: [
      // Fastify's reply parameter is a supported receiver name.
      {
        code: 'function handler(req, reply) { reply.redirect(req.query.next) }',
        errors: [{ messageId: 'openRedirect' }],
      },
      // Was a miss: the Location header name via a shared constant rather
      // than an inline literal.
      {
        code: handler(`const header = 'Location'; res.setHeader(header, req.query.url)`),
        errors: [{ messageId: 'openRedirect' }],
      },
      // Renamed import of next/navigation's redirect is not an evasion —
      // the module-rooted sink matches the imported name.
      {
        code: `import { redirect as goTo } from 'next/navigation'; function h(req) { goTo(req.query.to) }`,
        errors: [{ messageId: 'openRedirect' }],
      },
    ],
  },

  { valid: [], invalid: [] },
))
