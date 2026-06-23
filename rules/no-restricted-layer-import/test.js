const { messages } = require('./')
const { test } = require('../../machinery/test')

test('no-restricted-layer-import', {
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
    // relative import: skipped
    {
      filename: '/project/src/pages/Home.js',
      code: `import styles from './Home.css'`,
    },
    // package import: skipped
    {
      filename: '/project/src/pages/Home.js',
      code: `import config from '@kaliber/config'`,
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
    // unknown layer: not restricted
    {
      filename: '/project/src/search/client.js',
      code: `import { Button } from '/features/buildingBlocks/Button'`,
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
    // machinery → features: forbidden (nested machinery file)
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
  ],
})
