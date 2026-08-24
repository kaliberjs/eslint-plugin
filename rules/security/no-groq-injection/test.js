const { test, merge } = require('../../../machinery/test')

const handler = code => `function handler(req, res) { ${code} }`

test('security-no-groq-injection', merge(
  {
    // --- the vertical slice, both directions -----------------------------
    valid: [
      // Parameterized: the taint is in argument 1, and argument 1 is not the
      // sink. No special case in the rule makes this work.
      handler(`const slug = req.query.slug; client.fetch('*[slug.current == $slug]', { slug })`),
      handler(`const slug = req.query.slug; client.fetch(groq\`*[slug.current == $slug]\`, { slug })`),
      handler(`const slug = req.params.slug; readOnlyClient.fetch(groq\`*[_type == $type && slug.current == $slug][0]\`, { type: 'post', slug })`),

      // A locally-defined query-fragment constant used inside a groq-tagged
      // template. This is the dominant real-world composition pattern
      // (sub-projections shared across queries) and must not be confused
      // with untrusted-data interpolation: the fragment itself never
      // derives from a registered source.
      handler(`const postFields = groq\`{ title, slug }\`; readOnlyClient.fetch(groq\`*[_type == "post"] \${postFields}\`)`),
    ],
    invalid: [
      {
        code: handler(`const slug = req.query.slug; client.fetch(groq\`*[slug.current == "\${slug}"]\`)`),
        errors: [{ messageId: 'groqInjectionQualified' }],
      },
      {
        code: handler(`const slug = req.query.slug; client.fetch('*[slug.current == "' + slug + '"]')`),
        errors: [{ messageId: 'groqInjectionQualified' }],
      },
    ],
  },

  {
    // --- sink / receiver coverage ------------------------------------------
    valid: [
      // A receiver that doesn't look like a Sanity client is not this
      // rule's concern.
      handler('someOtherObject.fetch(groq`*[slug.current == "${req.query.slug}"]`)'),
      // Static queries never report, tagged or not.
      "client.fetch(groq`*[_type == 'settings'][0]`)",
    ],
    invalid: [
      {
        code: handler(`const slug = req.params.slug; sanityClient.fetch(groq\`*[slug.current == "\${slug}"]\`)`),
        errors: [{ messageId: 'groqInjectionQualified' }],
      },
      {
        code: handler(`const id = req.query.id; authorizedClient.fetch(\`*[_id == "\${id}"]\`)`),
        errors: [{ messageId: 'groqInjectionQualified' }],
      },
      {
        code: handler(`const id = req.query.id; sanityReadOnlyClient.fetch(groq\`*[_id == "\${id}"]\`)`),
        errors: [{ messageId: 'groqInjectionQualified' }],
      },
      {
        code: handler(`const id = req.query.id; sanityWriteClient.fetch(groq\`*[_id == "\${id}"]\`)`),
        errors: [{ messageId: 'groqInjectionQualified' }],
      },
      {
        code: handler(`const type = req.query.type; previewClient.fetch(groq\`*[_type == "\${type}"]\`)`),
        errors: [{ messageId: 'groqInjectionQualified' }],
      },
    ],
  },
))
