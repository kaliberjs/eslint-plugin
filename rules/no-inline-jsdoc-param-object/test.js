const { test } = require('../../machinery/test')

test('no-inline-jsdoc-param-object', {
  valid: [
    // the dotted form is the point
    {
      code: [
        '/**',
        ' * @param {object} props',
        ' * @param {string} props.href',
        ' */',
        'function f({ href }) { return href }',
      ].join('\n'),
    },

    // a nested path describes a property the signature does not destructure
    { code: '/** @param {{ username: string, password: string }} options.auth */\nfunction f(options) { return options }' },

    // an array of objects has no dotted equivalent
    { code: '/** @param {{ at: string, fraction: number }[]} breakpoints */\nfunction f(breakpoints) { return breakpoints }' },

    // overload signatures need the inline form; dotted params break resolution
    {
      code: [
        '/**',
        ' * @overload',
        ' * @param {{ docType: string }} options',
        ' */',
        'function f(options) { return options }',
      ].join('\n'),
    },

    // the implementation signature of an overloaded function, whose own block
    // has no @overload but which is still resolved against the ones above it
    {
      code: [
        '/**',
        ' * @overload',
        ' * @param {{ docType: string }} options',
        ' */',
        '',
        '/**',
        ' * @param {{ docType: string }} [options]',
        ' */',
        'export function f(options) { return options }',
      ].join('\n'),
    },

    // not a parameter position
    { code: '/** @typedef {{ a: string }} Thing */' },
    { code: '/** @returns {{ a: string }} */\nfunction f() { return { a: 1 } }' },

    // an index signature cannot be written as dotted sub-params
    { code: '/** @param {{ [key: string]: string }} map */\nfunction f(map) { return map }' },

    // nor can an intersection
    { code: '/** @param {{ a: string } & Other} props */\nfunction f(props) { return props }' },

    // plain types are untouched
    { code: '/** @param {string} name */\nfunction f(name) { return name }' },
    { code: '// not jsdoc at all: @param {{ a: string }} props' },
  ],

  invalid: [
    // single-line block gets expanded
    {
      code: '/** @param {{ href: string }} params */\nfunction f({ href }) { return href }',
      output: [
        '/**',
        ' * @param {object} params',
        ' * @param {string} params.href',
        ' */',
        'function f({ href }) { return href }',
      ].join('\n'),
      errors: [{ messageId: 'inlineParamObject' }],
    },

    // optional properties keep their optionality as brackets
    {
      code: [
        '/**',
        ' * @param {{ href: string, targetSelf?: boolean }} params',
        ' * @returns {string}',
        ' */',
        'function f({ href, targetSelf }) { return href + targetSelf }',
      ].join('\n'),
      output: [
        '/**',
        ' * @param {object} params',
        ' * @param {string} params.href',
        ' * @param {boolean} [params.targetSelf]',
        ' * @returns {string}',
        ' */',
        'function f({ href, targetSelf }) { return href + targetSelf }',
      ].join('\n'),
      errors: [{ messageId: 'inlineParamObject' }],
    },

    // an optional root makes its children optional too
    {
      code: '/** @param {{ countryAndLanguage?: string }} [options] */\nfunction f(options) { return options }',
      output: [
        '/**',
        ' * @param {object} [options]',
        ' * @param {string} [options.countryAndLanguage]',
        ' */',
        'function f(options) { return options }',
      ].join('\n'),
      errors: [{ messageId: 'inlineParamObject' }],
    },

    // `=>` must not read as a closing angle bracket
    {
      code: '/** @param {{ reportError: (error: Error) => void, children?: string }} props */\nfunction f({ reportError, children }) { return reportError || children }',
      output: [
        '/**',
        ' * @param {object} props',
        ' * @param {(error: Error) => void} props.reportError',
        ' * @param {string} [props.children]',
        ' */',
        'function f({ reportError, children }) { return reportError || children }',
      ].join('\n'),
      errors: [{ messageId: 'inlineParamObject' }],
    },

    // a comma inside a generic is not a property separator
    {
      code: '/** @param {{ lookup: Record<string, string>, count: number }} params */\nfunction f({ lookup, count }) { return lookup || count }',
      output: [
        '/**',
        ' * @param {object} params',
        ' * @param {Record<string, string>} params.lookup',
        ' * @param {number} params.count',
        ' */',
        'function f({ lookup, count }) { return lookup || count }',
      ].join('\n'),
      errors: [{ messageId: 'inlineParamObject' }],
    },

    // nor is a comma inside a nested object type
    {
      code: '/** @param {{ nested: { a: string, b: string }, flag: boolean }} params */\nfunction f({ nested, flag }) { return nested || flag }',
      output: [
        '/**',
        ' * @param {object} params',
        ' * @param {{ a: string, b: string }} params.nested',
        ' * @param {boolean} params.flag',
        ' */',
        'function f({ nested, flag }) { return nested || flag }',
      ].join('\n'),
      errors: [{ messageId: 'inlineParamObject' }],
    },

    // a description on the tag stays with the root
    {
      code: '/** @param {{ a: string }} params - the parameters */\nfunction f({ a }) { return a }',
      output: [
        '/**',
        ' * @param {object} params - the parameters',
        ' * @param {string} params.a',
        ' */',
        'function f({ a }) { return a }',
      ].join('\n'),
      errors: [{ messageId: 'inlineParamObject' }],
    },

    // a type spread over several lines, with ` * ` continuation prefixes
    {
      code: [
        '/**',
        ' * @param {{',
        ' *   title: string,',
        ' *   value?: unknown,',
        ' * }} data',
        ' */',
        'function f({ title, value }) { return title || value }',
      ].join('\n'),
      output: [
        '/**',
        ' * @param {object} data',
        ' * @param {string} data.title',
        ' * @param {unknown} [data.value]',
        ' */',
        'function f({ title, value }) { return title || value }',
      ].join('\n'),
      errors: [{ messageId: 'inlineParamObject' }],
    },

    // an import() type survives intact
    {
      code: "/** @param {{ clientConfig: import('/machinery/ClientConfig').ClientConfig }} props */\nfunction f({ clientConfig }) { return clientConfig }",
      output: [
        '/**',
        ' * @param {object} props',
        " * @param {import('/machinery/ClientConfig').ClientConfig} props.clientConfig",
        ' */',
        'function f({ clientConfig }) { return clientConfig }',
      ].join('\n'),
      errors: [{ messageId: 'inlineParamObject' }],
    },
  ],
})
