// module.exports = {
//   rules: {
//     'require-data-x-on-links-and-buttons': require('./rules/require-data-x-on-links-and-buttons'),
//     'data-x-must-be-english': require('./rules/data-x-must-be-english'),
//     'require-data-x-context': require('./rules/require-data-x-context'),
//     'external-clickout-prefix': require('./rules/external-clickout-prefix'),
//     'require-data-x-id-on-lists': require('./rules/require-data-x-id-on-lists'),
//     'cta-prepend': require('./rules/cta-prepend'),
//     'data-x-action-format': require('./rules/data-x-action-format'),
//     'multiple-cta-style-suffix': require('./rules/multiple-cta-style-suffix'),
//     'data-x-toggle': require('./rules/data-x-toggle'),
//   },

//   configs: {
//     recommended: {
//       plugins: ['data-x'],
//       rules: {
//         'data-x/require-data-x-on-links-and-buttons': 'error',
//         'data-x/data-x-must-be-english': 'error',
//         'data-x/require-data-x-context': 'error',
//         'data-x/external-clickout-prefix': 'error',
//         'data-x/require-data-x-id-on-lists': 'warn',
//         'data-x/cta-prepend': 'error',
//         'data-x/data-x-action-format': 'error',
//         'data-x/multiple-cta-style-suffix': 'warn',
//         'data-x/data-x-toggle': 'error',
//       },
//     },
//   },
// }

const hasProp = require('jsx-ast-utils/hasProp')
const getPropValue = require('jsx-ast-utils/getPropValue')

const messages = {
  missingDataX: tag => `Missing "data-x" attribute on <${tag}>.`,
  nonEnglish: val => `"${val}" contains non-English (non-ASCII) characters.`,
  missingContext: tag => `<${tag}> is missing a "data-x-context" attribute.`,
  clickoutPrefix: val => `External links must use "clickout-" prefix in data-x (found "${val}").`,
  missingId: 'Repeated list items must include a "data-x-id" attribute.',
  ctaPrefix: val => `CTA "${val}" must prepend "cta-".`,
  invalidActionFormat: val => `Invalid format "${val}". Use "{{action}}--{{target}}".`,
  missingStyleSuffix: val => `CTA variant "${val}" should append "-{{kleur/stijl}}" suffix.`,
  missingToggle: val => `Toggle component "${val}" should include "toggle".`,
}

module.exports = {
  messages,
  meta: { type: 'problem' },

  create(context) {
    return {
      JSXOpeningElement(node) {
        const tag = node.name && node.name.name
        if (!tag) return

        const dataX = getPropValue(node, 'data-x')
        const hasDataX = hasProp(node.attributes, 'data-x')
        const href = getPropValue(node, 'href')

        // 1️⃣ Require data-x on <a> and <button>
        if ((tag === 'a' || tag === 'button') && !hasDataX)
          return reportMissingDataX(node, tag)

        // 2️⃣ English only
        if (hasDataX && /[^\x00-\x7F]/.test(dataX))
          return reportNonEnglish(node, dataX)

        // 3️⃣ Require data-x-context
        if ((tag === 'a' || tag === 'button') && !hasProp(node.attributes, 'data-x-context'))
          return reportMissingContext(node, tag)

        // 4️⃣ External clickout prefix
        if (href && /^https?:\/\//.test(href) && hasDataX && !/^clickout-/.test(dataX))
          return reportClickoutPrefix(node, dataX)

        // 5️⃣ data-x-id in lists (simple heuristic)
        if (
          node.parent &&
          node.parent.openingElement &&
          ['ul', 'ol'].includes(node.parent.openingElement.name.name) &&
          !hasProp(node.attributes, 'data-x-id')
        )
          return reportMissingId(node)

        // 6️⃣ CTA prefix
        if (dataX && dataX.includes('applyform') && !/^cta-/.test(dataX))
          return reportCtaPrefix(node, dataX)

        // 7️⃣ Action format
        if (dataX && !/^[a-z0-9-]+--[a-z0-9-]+$/.test(dataX) && !/^clickout-/.test(dataX))
          return reportInvalidActionFormat(node, dataX)

        // 8️⃣ CTA style suffix
        if (dataX && dataX.startsWith('cta-') && !/-[a-z]+$/.test(dataX))
          return reportMissingStyleSuffix(node, dataX)

        // 9️⃣ Toggle inclusion
        if (dataX && /(accordion|menu)/.test(dataX) && !/toggle/.test(dataX))
          return reportMissingToggle(node, dataX)
      },
    }

    // 🧭 Reporting helpers
    function reportMissingDataX(node, tag) {
      context.report({ node, message: messages.missingDataX(tag) })
    }
    function reportNonEnglish(node, val) {
      context.report({ node, message: messages.nonEnglish(val) })
    }
    function reportMissingContext(node, tag) {
      context.report({ node, message: messages.missingContext(tag) })
    }
    function reportClickoutPrefix(node, val) {
      context.report({ node, message: messages.clickoutPrefix(val) })
    }
    function reportMissingId(node) {
      context.report({ node, message: messages.missingId })
    }
    function reportCtaPrefix(node, val) {
      context.report({ node, message: messages.ctaPrefix(val) })
    }
    function reportInvalidActionFormat(node, val) {
      context.report({ node, message: messages.invalidActionFormat(val) })
    }
    function reportMissingStyleSuffix(node, val) {
      context.report({ node, message: messages.missingStyleSuffix(val) })
    }
    function reportMissingToggle(node, val) {
      context.report({ node, message: messages.missingToggle(val) })
    }
  },
}
