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
  },

  configs: {
    // Opt-in only, and deliberately not part of any recommended config. The
    // security rules carry a different risk profile from the house rules: a
    // noisy security rule does not just get itself disabled, it gets the whole
    // shared config distrusted. Enabling them has to be a decision.
    //
    // `warn` rather than `error` for the first release: the analysis reports
    // medium-confidence findings, and a medium-confidence finding failing CI on
    // day one is how a plugin gets removed.
    security: {
      rules: {
        '@kaliber/security-no-sql-injection': 'warn',

        // High severity and high confidence — a literal assignment or a
        // literal string with no dataflow and no legitimate production use —
        // so the severity matrix puts them at error even in the opt-in config.
        '@kaliber/security-no-node-tls-reject-unauthorized': 'error',
        '@kaliber/security-no-disabled-tls-verification': 'error',
        '@kaliber/security-no-jwt-alg-none': 'error',
        '@kaliber/security-no-ecb-mode': 'error',
        '@kaliber/security-no-des-3des': 'error',

        // High confidence about *what the code does*, but exploitability
        // depends on things the syntax cannot show (is the input tainted,
        // is the value sanitized upstream) — so they report at warn.
        '@kaliber/security-no-jwt-decode-without-verify': 'warn',
        '@kaliber/security-no-shell-true': 'warn',
        '@kaliber/security-no-authorization-header-log': 'warn',
        '@kaliber/security-no-dangerously-set-inner-html': 'warn',
        '@kaliber/security-no-command-injection': 'warn',
        '@kaliber/security-no-inner-html': 'warn',
        '@kaliber/security-no-dom-xss-sink': 'warn',
        '@kaliber/security-no-eval': 'warn',
        '@kaliber/security-no-jwt-algorithm-confusion': 'warn',
        '@kaliber/security-no-md5': 'warn',
        '@kaliber/security-no-permissive-cors': 'warn',
        '@kaliber/security-no-insecure-cookie-flags': 'warn',
        '@kaliber/security-no-plain-http-url': 'warn',
        '@kaliber/security-no-javascript-url': 'warn',
        '@kaliber/security-no-sensitive-data-in-web-storage': 'warn',
        '@kaliber/security-no-dynamic-require': 'warn',
        '@kaliber/security-no-disabled-security-framework-check': 'warn',
        '@kaliber/security-no-weak-jwt-secret': 'warn',
        '@kaliber/security-no-hardcoded-crypto-key': 'warn',
        '@kaliber/security-no-xxe': 'warn',
        '@kaliber/security-no-unsafe-deserialization': 'error',
        '@kaliber/security-no-timing-unsafe-secret-comparison': 'warn',
        '@kaliber/security-no-sha1-for-security': 'warn',
      },
    },
  },
}

module.exports = plugin
