# no-restricted-layer-import

Enforce architectural layer boundaries — prevent imports that cross forbidden layer boundaries.

## Rule Details

This rule checks absolute `/`-prefixed imports against configurable layer boundaries. Each architectural layer has an allow-list of layers it may import from.

### ❌ Invalid

```js
// In machinery/hooks/useX.js — machinery may not import from features
import { Button } from '/features/buildingBlocks/Button'

// In features/buildingBlocks/Button.js — buildingBlocks may not import from pages
import { Home } from '/pages/Home'
```

### ✅ Valid

```js
// In pages/Home.js — pages may import from features and machinery
import { Hero } from '/features/hero/HomepageHero'
import { useTranslate } from '/machinery/I18n'

// In features/hero/Hero.js — features may import from buildingBlocks and machinery
import { Button } from '/features/buildingBlocks/Button'
```

## Default Layer Boundaries

All layers can import from shared root modules (`routeMap`, `i18n`, `cssGlobal`, `images`, `search`, `constants`, `groq`, `head`, etc.).

| Layer | May also import from |
|-------|---------------------|
| `features/buildingBlocks` | `features/buildingBlocks`, `machinery` |
| `features/*` | `features/*`, `features/buildingBlocks`, `machinery` |
| `machinery` | `machinery` |
| `pages` | `pages`, `features`, `machinery`, `templates`, `wrappers` |
| `templates` | `features`, `machinery` |
| `wrappers` | `features`, `machinery` |

## Options

Override the default boundaries with a custom `layers` object:

```js
'@kaliber/no-restricted-layer-import': ['error', {
  layers: {
    'machinery': ['machinery', 'domain'],
    'pages': ['pages', 'features', 'machinery', 'domain'],
  }
}]
```
