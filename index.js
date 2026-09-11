const pkg = require('./package.json')

const plugin = {
  meta: {
    name: '@kaliber/eslint-plugin',
    version: pkg.version,
  },

  rules: {
    'component-properties': require('./rules/component-properties'),
    'layout-class-name': require('./rules/layout-class-name'),
    'naming-policy': require('./rules/naming-policy'),
    'no-default-export': require('./rules/no-default-export'),
    'no-relative-parent-import': require('./rules/no-relative-parent-import'),
    'jsx-key': require('./rules/jsx-key'),
    'import-sort': require('./rules/import-sort'),
    'position-center': require('./rules/position-center'),

    'data-x-required': require('./rules/data-x-required'),
    'data-x-latin-only': require('./rules/data-x-latin-only'),
    'data-x-clickout-prefix': require('./rules/data-x-clickout-prefix'),
    'data-x-unique-id': require('./rules/data-x-unique-id'),
    'data-x-cta-prefix': require('./rules/data-x-cta-prefix'),
    'data-x-onpage-action-format': require('./rules/data-x-onpage-action-format'),
    'data-x-context': require('./rules/data-x-context'),

    'data-x-toggle-prefix': require('./rules/data-x-toggle-prefix'),
    'data-x-sectioning-elements': require('./rules/data-x-sectioning-elements'),
    'data-x-form-naming': require('./rules/data-x-form-naming'),

    'todo-ticket-reference': require('./rules/todo-ticket-reference'),

    'stable-query-client': require('./rules/stable-query-client'),

    'security-no-sql-injection': require('./rules/security/no-sql-injection'),
    'security-no-node-tls-reject-unauthorized': require('./rules/security/no-node-tls-reject-unauthorized'),
    'security-no-disabled-tls-verification': require('./rules/security/no-disabled-tls-verification'),
    'security-no-jwt-alg-none': require('./rules/security/no-jwt-alg-none'),
    'security-no-jwt-decode-without-verify': require('./rules/security/no-jwt-decode-without-verify'),
    'security-no-ecb-mode': require('./rules/security/no-ecb-mode'),
    'security-no-des-3des': require('./rules/security/no-des-3des'),
    'security-no-shell-true': require('./rules/security/no-shell-true'),
    'security-no-authorization-header-log': require('./rules/security/no-authorization-header-log'),
    'security-no-dangerously-set-inner-html': require('./rules/security/no-dangerously-set-inner-html'),
    'security-no-command-injection': require('./rules/security/no-command-injection'),
    'security-no-inner-html': require('./rules/security/no-inner-html'),
    'security-no-dom-xss-sink': require('./rules/security/no-dom-xss-sink'),
    'security-no-eval': require('./rules/security/no-eval'),
    'security-no-jwt-algorithm-confusion': require('./rules/security/no-jwt-algorithm-confusion'),
    'security-no-md5': require('./rules/security/no-md5'),
    'security-no-permissive-cors': require('./rules/security/no-permissive-cors'),
    'security-no-insecure-cookie-flags': require('./rules/security/no-insecure-cookie-flags'),
    'security-no-plain-http-url': require('./rules/security/no-plain-http-url'),
    'security-no-javascript-url': require('./rules/security/no-javascript-url'),
    'security-no-sensitive-data-in-web-storage': require('./rules/security/no-sensitive-data-in-web-storage'),
    'security-no-dynamic-require': require('./rules/security/no-dynamic-require'),
    'security-no-disabled-security-framework-check': require('./rules/security/no-disabled-security-framework-check'),
    'security-no-weak-jwt-secret': require('./rules/security/no-weak-jwt-secret'),
    'security-no-hardcoded-crypto-key': require('./rules/security/no-hardcoded-crypto-key'),
    'security-no-xxe': require('./rules/security/no-xxe'),
    'security-no-unsafe-deserialization': require('./rules/security/no-unsafe-deserialization'),
    'security-no-timing-unsafe-secret-comparison': require('./rules/security/no-timing-unsafe-secret-comparison'),
    'security-no-sha1-for-security': require('./rules/security/no-sha1-for-security'),
    'security-no-static-iv': require('./rules/security/no-static-iv'),
    'security-no-template-autoescape-disabled': require('./rules/security/no-template-autoescape-disabled'),
    'security-no-target-blank-without-noopener': require('./rules/security/no-target-blank-without-noopener'),
    'security-no-jquery-html-sink': require('./rules/security/no-jquery-html-sink'),
    'security-no-hardcoded-credentials': require('./rules/security/no-hardcoded-credentials'),
    'security-no-hardcoded-api-key': require('./rules/security/no-hardcoded-api-key'),
    'security-no-path-traversal': require('./rules/security/no-path-traversal'),
    'security-no-firebase-path-injection': require('./rules/security/no-firebase-path-injection'),
    'security-no-groq-injection': require('./rules/security/no-groq-injection'),
    'security-no-elasticsearch-injection': require('./rules/security/no-elasticsearch-injection'),
    'security-no-open-redirect': require('./rules/security/no-open-redirect'),
    'security-no-client-side-open-redirect': require('./rules/security/no-client-side-open-redirect'),
    'security-no-ssrf': require('./rules/security/no-ssrf'),
    'security-no-weak-key-size': require('./rules/security/no-weak-key-size'),
    'security-no-zip-slip': require('./rules/security/no-zip-slip'),
  },

  configs: {},
}

// The baseline: rules that report a concrete weakness with provenance-gated
// or dataflow-backed evidence. `error` is reserved for findings that are both
// high impact and high confidence under machinery/security/finding.js — a
// literal switch that disables a protection, with no dataflow to be unsure
// about. Everything taint-based reports at `warn`, because exploitability
// depends on things the syntax cannot show.
const baseline = {
  '@kaliber/security-no-node-tls-reject-unauthorized': 'error',
  '@kaliber/security-no-disabled-tls-verification': 'error',
  '@kaliber/security-no-jwt-alg-none': 'error',
  '@kaliber/security-no-unsafe-deserialization': 'error',

  '@kaliber/security-no-sql-injection': 'warn',
  '@kaliber/security-no-command-injection': 'warn',
  '@kaliber/security-no-dom-xss-sink': 'warn',
  '@kaliber/security-no-path-traversal': 'warn',
  '@kaliber/security-no-firebase-path-injection': 'warn',
  '@kaliber/security-no-groq-injection': 'warn',
  '@kaliber/security-no-elasticsearch-injection': 'warn',
  '@kaliber/security-no-open-redirect': 'warn',
  '@kaliber/security-no-client-side-open-redirect': 'warn',
  '@kaliber/security-no-ssrf': 'warn',
  '@kaliber/security-no-jwt-algorithm-confusion': 'warn',
  '@kaliber/security-no-insecure-cookie-flags': 'warn',
  '@kaliber/security-no-weak-key-size': 'warn',
  '@kaliber/security-no-zip-slip': 'warn',
}

// Everything else: name-based matching, policy preferences, and findings whose
// exploitability the analysis cannot establish. Useful to read through once;
// not useful as a CI gate, which is why the audit preset is warn throughout.
const auditOnly = [
  '@kaliber/security-no-jwt-decode-without-verify',
  '@kaliber/security-no-shell-true',
  '@kaliber/security-no-authorization-header-log',
  '@kaliber/security-no-dangerously-set-inner-html',
  '@kaliber/security-no-inner-html',
  '@kaliber/security-no-jquery-html-sink',
  '@kaliber/security-no-eval',
  '@kaliber/security-no-md5',
  '@kaliber/security-no-sha1-for-security',
  '@kaliber/security-no-ecb-mode',
  '@kaliber/security-no-des-3des',
  '@kaliber/security-no-static-iv',
  '@kaliber/security-no-permissive-cors',
  '@kaliber/security-no-plain-http-url',
  '@kaliber/security-no-javascript-url',
  '@kaliber/security-no-sensitive-data-in-web-storage',
  '@kaliber/security-no-dynamic-require',
  '@kaliber/security-no-disabled-security-framework-check',
  '@kaliber/security-no-weak-jwt-secret',
  '@kaliber/security-no-hardcoded-crypto-key',
  '@kaliber/security-no-hardcoded-credentials',
  '@kaliber/security-no-hardcoded-api-key',
  '@kaliber/security-no-xxe',
  '@kaliber/security-no-timing-unsafe-secret-comparison',
  '@kaliber/security-no-template-autoescape-disabled',
  '@kaliber/security-no-target-blank-without-noopener',
]

// Both presets carry the plugin they name, so `eslint.config.js` can spread
// one straight into its array. Assigned after `plugin` exists because a flat
// config that registers a plugin has to reference the finished object.
//
// Opt-in only, and deliberately not part of any recommended config. The
// security rules carry a different risk profile from the house rules: a noisy
// security rule does not just get itself disabled, it gets the whole shared
// config distrusted. Enabling them has to be a decision.
plugin.configs.security = {
  plugins: { '@kaliber': plugin },
  rules: { ...baseline },
}

// Every registered security rule, all at warn. Audit findings answer "what
// should someone read through once", not "what should fail the build".
plugin.configs['security-audit'] = {
  plugins: { '@kaliber': plugin },
  rules: Object.fromEntries([...Object.keys(baseline), ...auditOnly].map(id => [id, 'warn'])),
}

module.exports = plugin
