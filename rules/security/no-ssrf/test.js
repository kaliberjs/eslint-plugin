const { test, merge, handler } = require('../../../machinery/test')

test('security-no-ssrf', merge(
  {
    valid: [
      // A literal target is the overwhelming majority of every fetch call.
      handler(`fetch('https://api.example.com/items')`),
      handler(`fetch(\`\${process.env.API_URL}/items\`)`),

      // Fixed origin, only a path segment from input, escaped.
      handler(`fetch(\`https://api.example.com/items/\${encodeURIComponent(req.params.id)}\`)`),

      // The remediation: a hostname allowlist. Both spellings — checking the
      // parsed object, and checking the raw string through new URL().
      handler(`
        const ALLOWED = ['images.example.com']
        const target = new URL(req.query.url)
        if (!ALLOWED.includes(target.hostname)) return res.status(400).end()
        fetch(target)
      `),
      handler(`
        const ALLOWED = ['images.example.com']
        if (!ALLOWED.includes(new URL(req.query.url).hostname)) return res.status(400).end()
        fetch(req.query.url)
      `),

      // A Request object is not a taintable string. Deliberate miss, not a
      // pretence of safety — recorded in the readme.
      handler(`fetch(new Request(req.query.url))`),

      // A locally bound fetch is not the platform global.
      `const fetch = require('./our-fetch'); function handler(req) { fetch(req.query.url) }`,

      // Sinks belonging to other rules, or to nothing at all.
      handler(`res.redirect(req.query.next)`),
      handler(`client.fetch(req.query.q)`),
      handler(`api.get(req.query.id)`),
      handler(`cache.get(req.query.key)`),
    ],
    invalid: [
      {
        code: handler(`fetch(req.query.url)`),
        errors: [{ messageId: 'ssrf' }],
      },
      {
        // The options object is argument 1; the target is still argument 0.
        code: handler(`fetch(req.body.callbackUrl, { method: 'POST', body: '{}' })`),
        errors: [{ messageId: 'ssrf' }],
      },
      {
        code: handler(`window.fetch(req.query.url)`),
        errors: [{ messageId: 'ssrf' }],
      },
      {
        code: handler(`fetch(\`https://\${req.query.host}/items\`)`),
        errors: [{ messageId: 'ssrfQualified' }],
      },
      {
        code: "import axios from 'axios'; function handler(req) { axios(req.query.url) }",
        errors: [{ messageId: 'ssrf' }],
      },
      {
        code: "import axios from 'axios'; function handler(req) { axios.get(req.query.url) }",
        errors: [{ messageId: 'ssrf' }],
      },
      {
        code: "import got from 'got'; function handler(req) { got(req.query.url) }",
        errors: [{ messageId: 'ssrf' }],
      },
      {
        code: "const http = require('http'); function handler(req) { http.get(req.query.url) }",
        errors: [{ messageId: 'ssrf' }],
      },
      {
        code: "import { request } from 'undici'; function handler(req) { request(req.query.url) }",
        errors: [{ messageId: 'ssrf' }],
      },
      {
        code: "import fetch from 'node-fetch'; function handler(req) { fetch(req.query.url) }",
        errors: [{ messageId: 'ssrf' }],
      },

      // --- The host guard must not prove more than it proves.
      {
        // A base argument does not pin the host: `new URL('//evil.example.com',
        // base)` resolves to evil.example.com, and an input carrying a scheme
        // replaces the base outright. The check proves nothing here.
        code: handler(`
          const ALLOWED = ['api.example.com']
          if (!ALLOWED.includes(new URL(req.query.path, 'https://api.example.com').hostname)) return res.status(400).end()
          fetch(req.query.path)
        `),
        errors: [{ messageId: 'ssrf' }],
      },
      {
        // The guard checks a different expression than the one requested.
        code: handler(`
          const ALLOWED = ['api.example.com']
          if (!ALLOWED.includes(new URL(config.base).hostname)) return res.status(400).end()
          fetch(req.query.url)
        `),
        errors: [{ messageId: 'ssrf' }],
      },
      {
        // A non-foldable allowlist proves nothing, host check or not.
        code: handler(`
          if (!hostsFromDatabase.includes(new URL(req.query.url).hostname)) return res.status(400).end()
          fetch(req.query.url)
        `),
        errors: [{ messageId: 'ssrf' }],
      },
    ],
  },

  // --- Sinks reached inside a called function's body. The whole reason this
  // rule was blocked on interprocedural analysis: a route handler almost
  // never calls fetch itself, it delegates to a data-layer helper.
  {
    valid: [
      `
        function fetchRemote(url) { return fetch(url) }
        function handler(req) { return fetchRemote('https://api.example.com/health') }
      `,
    ],
    invalid: [
      {
        code: `
          function fetchRemote(url) { return fetch(url) }
          function handler(req) { return fetchRemote(req.query.url) }
        `,
        // Qualified: the flow crosses a parameter, which the analysis prices.
        errors: [{ messageId: 'ssrfQualified' }],
      },
      {
        code: `
          function proxy(target) { return axios.get(target) }
          function handler(req) { return proxy(req.body.target) }
        `,
        errors: [{ messageId: 'ssrfQualified' }],
      },
    ],
  },
))
