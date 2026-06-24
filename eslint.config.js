// Based on eslint-config-react-app
// https://github.com/facebookincubator/create-react-app/blob/cd3d04b71e91f533bdbdc3856775e1da81d445cf/packages/eslint-config-react-app/index.js

const fs = require('fs')
const path = require('path')
const { includeIgnoreFile } = require('@eslint/compat')
const js = require('@eslint/js')
const babelParser = require('@babel/eslint-parser')
const pluginReact = require('eslint-plugin-react')
const pluginReactHooks = require('eslint-plugin-react-hooks')
const pluginJsxA11y = require('eslint-plugin-jsx-a11y')
const pluginImportX = require('eslint-plugin-import-x')
const stylistic = require('@stylistic/eslint-plugin')
const globals = require('./machinery/globals.json')
const kaliberPlugin = require('./index')

const gitignorePath = path.resolve(process.cwd(), '.gitignore')

module.exports = [
  ...(fs.existsSync(gitignorePath) ? [includeIgnoreFile(gitignorePath)] : []),
  js.configs.recommended,
  {
    plugins: {
      '@kaliber': kaliberPlugin,
      'react': pluginReact,
      'react-hooks': pluginReactHooks,
      'jsx-a11y': pluginJsxA11y,
      'import-x': pluginImportX,
      '@stylistic': stylistic,
    },

    languageOptions: {
      parser: babelParser,
      ecmaVersion: 2020,
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
        requireConfigFile: false,
        babelOptions: {
          presets: ['@babel/preset-react'],
        },
      },
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.jest,
        Component: 'readonly',
        React: 'readonly',
        cx: 'readonly',
      },
    },

    settings: {
      'import-x/resolver': {
        [require.resolve('./lib/absolute-path-resolver-plugin')]: {
          path: './src',
        },
      },
      react: {
        version: 'detect',
      },
    },

    rules: {
      // ─── @kaliber rules ──────────────────────────────────────────
      '@kaliber/component-properties': 'warn',
      '@kaliber/layout-class-name': 'warn',
      '@kaliber/naming-policy': 'warn',
      '@kaliber/no-default-export': 'warn',
      '@kaliber/no-relative-parent-import': 'warn',
      '@kaliber/jsx-key': 'warn',
      '@kaliber/import-sort': 'warn',
      '@kaliber/no-null-return-in-universal': 'warn',

      // ─── @stylistic rules (migrated from deprecated core rules) ──
      '@stylistic/brace-style': ['warn', '1tbs', { allowSingleLine: true }],
      '@stylistic/indent': ['warn', 2, {
        SwitchCase: 1,
        flatTernaryExpressions: true,
      }],
      '@stylistic/arrow-spacing': 'warn',
      '@stylistic/block-spacing': 'warn',
      '@stylistic/comma-dangle': ['warn', 'only-multiline'],
      '@stylistic/comma-spacing': 'warn',
      '@stylistic/comma-style': 'warn',
      '@stylistic/dot-location': ['warn', 'property'],
      '@stylistic/eol-last': 'warn',
      '@stylistic/key-spacing': 'warn',
      '@stylistic/keyword-spacing': 'warn',
      '@stylistic/new-parens': 'warn',
      '@stylistic/no-extra-parens': ['warn', 'functions'],
      '@stylistic/no-floating-decimal': 'warn',
      '@stylistic/no-mixed-spaces-and-tabs': 'warn',
      '@stylistic/no-trailing-spaces': 'warn',
      '@stylistic/no-whitespace-before-property': 'warn',
      '@stylistic/object-curly-spacing': ['warn', 'always'],
      '@stylistic/quotes': ['warn', 'single', { avoidEscape: true, allowTemplateLiterals: 'always' }],
      '@stylistic/semi': ['warn', 'never'],
      '@stylistic/semi-spacing': ['warn', { before: false, after: true }],
      '@stylistic/space-before-blocks': 'warn',
      '@stylistic/space-before-function-paren': ['warn', { anonymous: 'never', named: 'never', asyncArrow: 'always' }],
      '@stylistic/space-infix-ops': 'warn',
      '@stylistic/space-unary-ops': ['warn', { words: true, nonwords: false }],
      '@stylistic/template-tag-spacing': 'warn',
      '@stylistic/no-mixed-operators': [
        'warn',
        {
          groups: [
            ['&', '|', '^', '~', '<<', '>>', '>>>'],
            ['==', '!=', '===', '!==', '>', '>=', '<', '<='],
            ['&&', '||'],
            ['in', 'instanceof'],
          ],
          allowSamePrecedence: false,
        },
      ],
      '@stylistic/rest-spread-spacing': ['warn', 'never'],

      // ─── Core logic rules ────────────────────────────────────────
      'accessor-pairs': 'warn',
      'array-callback-return': 'warn',
      'default-case': ['warn', { commentPattern: '^no default$' }],
      'eqeqeq': 'warn',
      'no-array-constructor': 'warn',
      'no-caller': 'warn',
      'no-class-assign': 'warn',
      'no-compare-neg-zero': 'warn',
      'no-cond-assign': 'warn',
      'no-const-assign': 'warn',
      'no-constant-condition': 'warn',
      'no-control-regex': 'warn',
      'no-debugger': 'warn',
      'no-delete-var': 'warn',
      'no-dupe-args': 'warn',
      'no-dupe-class-members': 'warn',
      'no-dupe-keys': 'warn',
      'no-duplicate-case': 'warn',
      'no-empty-character-class': 'warn',
      'no-empty-pattern': 'warn',
      'no-eval': 'warn',
      'no-ex-assign': 'warn',
      'no-extend-native': 'warn',
      'no-extra-bind': 'warn',
      'no-extra-boolean-cast': 'warn',
      'no-extra-label': 'warn',
      'no-fallthrough': 'warn',
      'no-func-assign': 'warn',
      'no-global-assign': 'warn',
      'no-implied-eval': 'warn',
      'no-invalid-regexp': 'warn',
      'no-irregular-whitespace': 'warn',
      'no-iterator': 'warn',
      'no-label-var': 'warn',
      'no-labels': ['warn', { allowLoop: true, allowSwitch: false }],
      'no-lone-blocks': 'warn',
      'no-loop-func': 'warn',
      'no-multi-str': 'warn',
      'no-new-func': 'warn',
      'no-object-constructor': 'warn', // was: no-new-object
      'no-new-native-nonconstructor': 'warn', // was: no-new-symbol
      'no-new-wrappers': 'warn',
      'no-obj-calls': 'warn',
      'no-octal': 'warn',
      'no-octal-escape': 'warn',
      'no-path-concat': 'warn',
      'no-proto': 'warn',
      'no-redeclare': 'warn',
      'no-regex-spaces': 'warn',
      'no-restricted-globals': ['warn', 'addEventListener', 'blur', 'close', 'closed', 'confirm', 'defaultStatus', 'defaultstatus', 'event', 'external', 'find', 'focus', 'frameElement', 'frames', 'history', 'innerHeight', 'innerWidth', 'length', 'location', 'locationbar', 'menubar', 'moveBy', 'moveTo', 'name', 'onblur', 'onwarn', 'onfocus', 'onload', 'onresize', 'onunload', 'open', 'opener', 'opera', 'outerHeight', 'outerWidth', 'pageXOffset', 'pageYOffset', 'parent', 'print', 'removeEventListener', 'resizeBy', 'resizeTo', 'screen', 'screenLeft', 'screenTop', 'screenX', 'screenY', 'scroll', 'scrollbars', 'scrollBy', 'scrollTo', 'scrollX', 'scrollY', 'self', 'status', 'statusbar', 'stop', 'toolbar', 'top'],
      'no-restricted-properties': [
        'warn',
        {
          object: 'require',
          property: 'ensure',
          message: 'Please use import() instead. More info: https://github.com/facebookincubator/create-react-app/blob/master/packages/react-scripts/template/README.md#code-splitting',
        },
        {
          object: 'System',
          property: 'import',
          message: 'Please use import() instead. More info: https://github.com/facebookincubator/create-react-app/blob/master/packages/react-scripts/template/README.md#code-splitting',
        },
      ],
      'no-restricted-syntax': ['warn', 'WithStatement'],
      'no-return-assign': 'warn',
      'no-script-url': 'warn',
      'no-self-assign': 'warn',
      'no-self-compare': 'warn',
      'no-shadow-restricted-names': 'warn',
      'no-sparse-arrays': 'warn',
      'no-template-curly-in-string': 'warn',
      'no-this-before-super': 'warn',
      'no-throw-literal': 'warn',
      'no-undef': 'warn',
      'no-unexpected-multiline': 'warn',
      'no-unreachable': 'warn',
      'no-unsafe-negation': 'warn',
      'no-unneeded-ternary': 'warn',
      'no-useless-return': 'warn',
      'no-unused-expressions': [
        'warn',
        {
          allowShortCircuit: true,
          allowTernary: true,
          allowTaggedTemplates: true,
        },
      ],
      'no-unused-labels': 'warn',
      'no-unused-vars': [
        'warn',
        {
          args: 'none',
          ignoreRestSiblings: true,
        },
      ],
      'no-use-before-define': [
        'warn',
        {
          functions: false,
          classes: false,
          variables: false,
        },
      ],
      'no-useless-computed-key': 'warn',
      'no-useless-concat': 'warn',
      'no-useless-constructor': 'warn',
      'no-useless-escape': 'warn',
      'no-with': 'warn',
      'object-shorthand': ['warn', 'always'],
      'radix': 'warn',
      'require-yield': 'warn',
      'strict': ['warn', 'never'],
      'unicode-bom': ['warn', 'never'],
      'use-isnan': 'warn',
      'valid-typeof': 'warn',

      // ─── import-x rules ──────────────────────────────────────────
      'import-x/first': 'warn',
      'import-x/no-amd': 'warn',
      'import-x/no-webpack-loader-syntax': 'warn',
      'import-x/no-default-export': 'off',
      'import-x/no-duplicates': ['warn', { considerQueryString: true }],
      'import-x/export': 'warn',
      'import-x/default': 'warn',
      'import-x/no-unresolved': 'warn',
      'import-x/named': 'warn',

      // ─── react rules ─────────────────────────────────────────────
      'react/jsx-boolean-value': 'warn',
      'react/jsx-curly-spacing': ['warn', 'never'],
      'react/jsx-equals-spacing': 'warn',
      'react/jsx-indent': ['warn', 2],
      'react/jsx-indent-props': ['warn', 2],
      'react/jsx-key': 'off',
      'react/jsx-no-comment-textnodes': 'warn',
      'react/jsx-no-duplicate-props': ['warn', { ignoreCase: true }],
      'react/jsx-no-target-blank': 'warn',
      'react/jsx-no-undef': ['warn', { allowGlobals: true }],
      'react/jsx-pascal-case': ['warn', { allowAllCaps: true }],
      'react/jsx-tag-spacing': 'warn',
      'react/jsx-uses-react': 'off',
      'react/jsx-uses-vars': 'warn',
      'react/jsx-wrap-multilines': ['warn', {
        declaration: 'parens-new-line',
        assignment: 'parens-new-line',
        return: 'parens-new-line',
        arrow: 'ignore',
        condition: 'ignore',
        logical: 'ignore',
        prop: 'ignore',
      }],
      'react/no-danger-with-children': 'warn',
      'react/no-deprecated': 'warn',
      'react/no-direct-mutation-state': 'warn',
      'react/no-unused-prop-types': 'warn',
      'react/prop-types': ['error', { skipUndeclared: true }],
      'react/react-in-jsx-scope': 'off',
      'react/require-render-return': 'warn',
      'react/self-closing-comp': 'warn',
      'react/void-dom-elements-no-children': 'warn',

      // ─── react-hooks rules ───────────────────────────────────────
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      // ─── jsx-a11y rules ──────────────────────────────────────────
      'jsx-a11y/alt-text': 'warn',
      'jsx-a11y/anchor-has-content': 'warn',
      'jsx-a11y/anchor-is-valid': 'warn',
      'jsx-a11y/aria-activedescendant-has-tabindex': 'warn',
      'jsx-a11y/aria-props': 'warn',
      'jsx-a11y/aria-proptypes': 'warn',
      'jsx-a11y/aria-role': 'warn',
      'jsx-a11y/aria-unsupported-elements': 'warn',
      'jsx-a11y/heading-has-content': 'warn',
      'jsx-a11y/html-has-lang': 'warn',
      'jsx-a11y/iframe-has-title': 'warn',
      'jsx-a11y/img-redundant-alt': 'warn',
      'jsx-a11y/no-access-key': 'warn',
      'jsx-a11y/no-distracting-elements': 'warn',
      'jsx-a11y/no-redundant-roles': 'warn',
      'jsx-a11y/role-has-required-aria-props': 'warn',
      'jsx-a11y/role-supports-aria-props': 'warn',
    },
  },
]
