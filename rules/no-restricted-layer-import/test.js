const { messages } = require('./')
const { test, merge } = require('../../machinery/test')

test('no-restricted-layer-import', merge(
  // ─── Default layers ───────────────────────────────────────────────────────
  {
    valid: [
      // pages → features: allowed
      {
        filename: '/project/src/pages/Home.js',
        code: `import { Hero } from '/features/hero/HomepageHero'`,
      },
      // pages → machinery: allowed
      {
        filename: '/project/src/pages/Home.js',
        code: `import { useTranslate } from '/machinery/I18n'`,
      },
      // pages → templates: allowed
      {
        filename: '/project/src/pages/Home.js',
        code: `import { PageTemplate } from '/templates/PageTemplate'`,
      },
      // pages → wrappers: allowed
      {
        filename: '/project/src/pages/Home.js',
        code: `import { AppWrapper } from '/wrappers/App'`,
      },
      // features → buildingBlocks: allowed
      {
        filename: '/project/src/features/hero/Hero.js',
        code: `import { Button } from '/features/buildingBlocks/Button'`,
      },
      // features → machinery: allowed
      {
        filename: '/project/src/features/hero/Hero.js',
        code: `import { useTranslate } from '/machinery/I18n'`,
      },
      // buildingBlocks → buildingBlocks: allowed (same layer)
      {
        filename: '/project/src/features/buildingBlocks/Button.js',
        code: `import { Icon } from '/features/buildingBlocks/Icon'`,
      },
      // buildingBlocks → machinery: allowed
      {
        filename: '/project/src/features/buildingBlocks/Button.js',
        code: `import { useTranslate } from '/machinery/I18n'`,
      },
      // machinery → machinery: allowed (same layer)
      {
        filename: '/project/src/machinery/hooks/useX.js',
        code: `import { something } from '/machinery/I18n'`,
      },
      // features → features (same feature): allowed
      {
        filename: '/project/src/features/hero/HomepageHero.js',
        code: `import PostcodeSearch from '/features/hero/PostcodeSearch.universal'`,
      },
      // templates → features: allowed
      {
        filename: '/project/src/templates/PageTemplate.js',
        code: `import { Hero } from '/features/hero/Hero'`,
      },
      // templates → machinery: allowed
      {
        filename: '/project/src/templates/PageTemplate.js',
        code: `import { useTranslate } from '/machinery/I18n'`,
      },
      // wrappers → features: allowed
      {
        filename: '/project/src/wrappers/App.js',
        code: `import { Navigation } from '/features/navigation/Navigation'`,
      },
      // wrappers → machinery: allowed
      {
        filename: '/project/src/wrappers/App.js',
        code: `import { useTranslate } from '/machinery/I18n'`,
      },
      // relative import: skipped (not absolute path)
      {
        filename: '/project/src/pages/Home.js',
        code: `import styles from './Home.css'`,
      },
      // package import: skipped (doesn't start with /)
      {
        filename: '/project/src/pages/Home.js',
        code: `import config from '@kaliber/config'`,
      },
      // unknown layer: not restricted (no allow-list defined)
      {
        filename: '/project/src/search/client.js',
        code: `import { Button } from '/features/buildingBlocks/Button'`,
      },
      // shared root module: always allowed from any layer
      {
        filename: '/project/src/features/hero/Hero.js',
        code: `import routeMap from '/routeMap'`,
      },
      {
        filename: '/project/src/machinery/I18n.js',
        code: `import { translations } from '/i18n/translations'`,
      },
      {
        filename: '/project/src/features/buildingBlocks/Button.js',
        code: `import { colors } from '/cssGlobal/colors'`,
      },
      // re-export: valid direction
      {
        filename: '/project/src/features/hero/Hero.js',
        code: `export { Button } from '/features/buildingBlocks/Button'`,
      },
      // export all: valid direction
      {
        filename: '/project/src/features/hero/Hero.js',
        code: `export * from '/features/buildingBlocks/Button'`,
      },
    ],
    invalid: [
      // machinery → features: forbidden
      {
        filename: '/project/src/machinery/I18n.js',
        code: `import { Button } from '/features/buildingBlocks/Button'`,
        errors: [{ message: messages['restricted layer import']('/features/buildingBlocks/Button', 'machinery', 'features/buildingBlocks') }],
      },
      // buildingBlocks → pages: forbidden
      {
        filename: '/project/src/features/buildingBlocks/Button.js',
        code: `import { Home } from '/pages/Home'`,
        errors: [{ message: messages['restricted layer import']('/pages/Home', 'features/buildingBlocks', 'pages') }],
      },
      // machinery → features (nested machinery file): forbidden
      {
        filename: '/project/src/machinery/hooks/useX.js',
        code: `import { Hero } from '/features/hero/Hero'`,
        errors: [{ message: messages['restricted layer import']('/features/hero/Hero', 'machinery', 'features/hero') }],
      },
      // buildingBlocks → other features: forbidden
      {
        filename: '/project/src/features/buildingBlocks/Button.js',
        code: `import { Hero } from '/features/hero/Hero'`,
        errors: [{ message: messages['restricted layer import']('/features/hero/Hero', 'features/buildingBlocks', 'features/hero') }],
      },
      // templates → pages: forbidden
      {
        filename: '/project/src/templates/PageTemplate.js',
        code: `import { Home } from '/pages/Home'`,
        errors: [{ message: messages['restricted layer import']('/pages/Home', 'templates', 'pages') }],
      },
      // features → pages: forbidden
      {
        filename: '/project/src/features/hero/Hero.js',
        code: `import { Home } from '/pages/Home'`,
        errors: [{ message: messages['restricted layer import']('/pages/Home', 'features/hero', 'pages') }],
      },
      // features → templates: forbidden
      {
        filename: '/project/src/features/hero/Hero.js',
        code: `import { PageTemplate } from '/templates/PageTemplate'`,
        errors: [{ message: messages['restricted layer import']('/templates/PageTemplate', 'features/hero', 'templates') }],
      },
      // features → wrappers: forbidden
      {
        filename: '/project/src/features/hero/Hero.js',
        code: `import { AppWrapper } from '/wrappers/App'`,
        errors: [{ message: messages['restricted layer import']('/wrappers/App', 'features/hero', 'wrappers') }],
      },
      // machinery → pages: forbidden
      {
        filename: '/project/src/machinery/I18n.js',
        code: `import { Home } from '/pages/Home'`,
        errors: [{ message: messages['restricted layer import']('/pages/Home', 'machinery', 'pages') }],
      },
      // re-export also flagged
      {
        filename: '/project/src/machinery/I18n.js',
        code: `export { Button } from '/features/buildingBlocks/Button'`,
        errors: [{ message: messages['restricted layer import']('/features/buildingBlocks/Button', 'machinery', 'features/buildingBlocks') }],
      },
      // export all also flagged
      {
        filename: '/project/src/machinery/I18n.js',
        code: `export * from '/features/hero/Hero'`,
        errors: [{ message: messages['restricted layer import']('/features/hero/Hero', 'machinery', 'features/hero') }],
      },
      // wrappers → pages: forbidden
      {
        filename: '/project/src/wrappers/App.js',
        code: `import { Home } from '/pages/Home'`,
        errors: [{ message: messages['restricted layer import']('/pages/Home', 'wrappers', 'pages') }],
      },
      // buildingBlocks → templates: forbidden
      {
        filename: '/project/src/features/buildingBlocks/Button.js',
        code: `import { PageTemplate } from '/templates/PageTemplate'`,
        errors: [{ message: messages['restricted layer import']('/templates/PageTemplate', 'features/buildingBlocks', 'templates') }],
      },
    ],
  },

  // ─── Custom layers ────────────────────────────────────────────────────────
  {
    valid: [
      // Custom layer 'domain' added — pages → domain: allowed
      {
        filename: '/project/src/pages/Home.js',
        code: `import { getLabels } from '/domain/labels'`,
        options: [{ layers: {
          'pages': ['pages', 'features', 'machinery', 'domain'],
          'domain': ['domain', 'machinery'],
        }}],
      },
      // Shared root modules still allowed with custom layers
      {
        filename: '/project/src/pages/Home.js',
        code: `import routeMap from '/routeMap'`,
        options: [{ layers: {
          'pages': ['pages', 'features', 'machinery', 'domain'],
        }}],
      },
      // Shared root modules allowed for custom layers
      {
        filename: '/project/src/domain/labels.js',
        code: `import { something } from '/i18n/translations'`,
        options: [{ layers: {
          'domain': ['domain', 'machinery'],
        }}],
      },
      // Default layers preserved when custom layers only add new ones
      {
        filename: '/project/src/features/hero/Hero.js',
        code: `import { Button } from '/features/buildingBlocks/Button'`,
        options: [{ layers: {
          'domain': ['domain', 'machinery'],
        }}],
      },
    ],
    invalid: [
      // Custom layer boundaries still enforced
      {
        filename: '/project/src/domain/labels.js',
        code: `import { Hero } from '/features/hero/Hero'`,
        options: [{ layers: {
          'domain': ['domain', 'machinery'],
        }}],
        errors: [{ message: messages['restricted layer import']('/features/hero/Hero', 'domain', 'features/hero') }],
      },
      // Default restrictions still apply with custom layers
      {
        filename: '/project/src/machinery/hooks/useX.js',
        code: `import { Button } from '/features/buildingBlocks/Button'`,
        options: [{ layers: {
          'domain': ['domain', 'machinery'],
        }}],
        errors: [{ message: messages['restricted layer import']('/features/buildingBlocks/Button', 'machinery', 'features/buildingBlocks') }],
      },
    ],
  },

  // ─── Custom sublayer parents (generalized /* pattern) ─────────────────────
  {
    valid: [
      // domain/* as sublayer parent — domain/auth can import domain/shared
      {
        filename: '/project/src/domain/auth/login.js',
        code: `import { validate } from '/domain/shared/validation'`,
        options: [{ layers: {
          'domain/shared': ['domain/shared', 'machinery'],
          'domain/*': ['domain/*', 'domain/shared', 'machinery'],
        }}],
      },
      // domain/* can import machinery
      {
        filename: '/project/src/domain/auth/login.js',
        code: `import { useTranslate } from '/machinery/I18n'`,
        options: [{ layers: {
          'domain/*': ['domain/*', 'machinery'],
        }}],
      },
      // Multiple sublayer parents — both features/* and domain/*
      {
        filename: '/project/src/domain/users/profile.js',
        code: `import { validate } from '/domain/shared/validation'`,
        options: [{ layers: {
          'domain/shared': ['domain/shared', 'machinery'],
          'domain/*': ['domain/*', 'domain/shared', 'machinery'],
        }}],
      },
    ],
    invalid: [
      // domain/* → features: forbidden when not in allow-list
      {
        filename: '/project/src/domain/auth/login.js',
        code: `import { Button } from '/features/buildingBlocks/Button'`,
        options: [{ layers: {
          'domain/*': ['domain/*', 'machinery'],
        }}],
        errors: [{ message: messages['restricted layer import']('/features/buildingBlocks/Button', 'domain/auth', 'features/buildingBlocks') }],
      },
      // domain/shared → domain/auth: forbidden (shared is lower layer)
      {
        filename: '/project/src/domain/shared/validation.js',
        code: `import { login } from '/domain/auth/login'`,
        options: [{ layers: {
          'domain/shared': ['domain/shared', 'machinery'],
          'domain/*': ['domain/*', 'domain/shared', 'machinery'],
        }}],
        errors: [{ message: messages['restricted layer import']('/domain/auth/login', 'domain/shared', 'domain/auth') }],
      },
    ],
  },
))
