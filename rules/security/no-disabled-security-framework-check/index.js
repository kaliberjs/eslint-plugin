const { getStaticValue } = require('@eslint-community/eslint-utils')
const { getStaticPropertyName, getCalleeName } = require('../../../machinery/ast')
const docsUrl = require('../../../machinery/docsUrl')
const { report } = require('../../../machinery/security/finding')

// Disabling a security framework's protections in configuration is a
// deliberate decision that should look like one. The slice below covers the
// two shapes the research entry calls out as most common: helmet middleware
// switched off per-feature, and Electron BrowserWindow webPreferences that
// turn the renderer into node-enabled, isolation-free code execution.

const HELMET_DISABLE_FLAGS = new Set(['contentSecurityPolicy', 'hsts', 'frameguard', 'noSniff', 'xssFilter'])

const ELECTRON_DANGEROUS = {
  webSecurity: { expected: true, problem: 'webSecurity: false disables same-origin policy' },
  nodeIntegration: { expected: false, problem: 'nodeIntegration: true exposes Node to the renderer' },
  contextIsolation: { expected: true, problem: 'contextIsolation: false removes the context sandbox' },
  allowRunningInsecureContent: { expected: false, problem: 'allowRunningInsecureContent: true permits mixed content' },
}

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Do not disable security framework protections in configuration (CWE-1188)',
      url: docsUrl(__dirname),
    },
    messages: {
      protectionDisabled: [
        '{{ what }} is disabled.',
        'The framework default existed because the attack it stops is common; disabling it silently re-opens that hole for every request or window.',
        'Configure the protection instead of removing it; if truly unavoidable, disable on the line with a comment explaining why.',
      ].join(' '),
    },
    schema: [],
  },

  create(context) {
    function visitCall(node) {
      const name = getCalleeName(node.callee)

      // helmet({ contentSecurityPolicy: false, ... })
      if (name === 'helmet') {
          const options = node.arguments.find(arg => arg.type === 'ObjectExpression')
          if (!options) return
          for (const property of options.properties) {
            if (property.type !== 'Property') continue
            const key = getStaticPropertyName(property)
            const value = getStaticValue(property.value, context.sourceCode.getScope(property.value))
            if (HELMET_DISABLE_FLAGS.has(key) && value?.value === false) {
              emit(context, property, `helmet's ${key} protection`)
            }
          }
          return
        }

        // new BrowserWindow({ webPreferences: { webSecurity: false, ... } })
        if (name === 'BrowserWindow') {
          const options = node.arguments.find(arg => arg.type === 'ObjectExpression')
          if (!options) return
          const prefs = options.properties.find(
            property => property.type === 'Property' && getStaticPropertyName(property) === 'webPreferences'
          )
          checkWebPreferences(prefs?.value)
        }
    }

    return {
      CallExpression: visitCall,
      NewExpression: visitCall,
    }

    function checkWebPreferences(value) {
      if (!value || value.type !== 'ObjectExpression') return
      for (const property of value.properties) {
        if (property.type !== 'Property') continue
        const rule = ELECTRON_DANGEROUS[getStaticPropertyName(property)]
        if (!rule) continue
        const propertyValue = getStaticValue(property.value, context.sourceCode.getScope(property.value))
        if (propertyValue && propertyValue.value !== rule.expected) {
          emit(context, property, rule.problem)
        }
      }
    }
  },
}

function emit(context, node, what) {
  report(context, {
    node,
    messageId: 'protectionDisabled',
    data: { what },
    severity: 'medium',
    confidence: 1,
  })
}
