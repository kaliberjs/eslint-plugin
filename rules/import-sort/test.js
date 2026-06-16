const { meta: { messages } } = require('./')
const { test } = require('../../machinery/test')

test('import-sort', {
  valid: [
    `
import config from '@kaliber/config'
import { createFloep } from '@kaliber/flap'

import { ImageText } from '/features/pageOnly/ImageText'

import { useReportError } from '/machinery/ReportError'

import styles from './Content.css'

import Instagram from '/images/icons/instagram.raw.svg'
    `,
    `
import config from '@kaliber/config'

import { ImageText } from '/features/pageOnly/ImageText'
import Image from '/features/buildingBlocks/Image.universal'
    `,
  ],
  invalid: [
    {
      // Wrong order of components (universal at top)
      code: `
import Image from '/features/buildingBlocks/Image.universal'
import { ImageText } from '/features/pageOnly/ImageText'
      `,
      output: `
import { ImageText } from '/features/pageOnly/ImageText'
import Image from '/features/buildingBlocks/Image.universal'
      `,
      errors: [{ message: messages.unsorted }]
    },
    {
      // Wrong order within same block
      code: `
import { ImageText } from '/features/pageOnly/ImageText'
import config from '@kaliber/config'
      `,
      output: `
import config from '@kaliber/config'

import { ImageText } from '/features/pageOnly/ImageText'
      `,
      errors: [{ message: messages.unsorted }]
    },
    {
      // Missing newline before machinery
      code: `
import config from '@kaliber/config'
import { useReportError } from '/machinery/ReportError'
      `,
      output: `
import config from '@kaliber/config'

import { useReportError } from '/machinery/ReportError'
      `,
      errors: [{ message: messages.unsorted }]
    },
    {
      // Missing newline before components
      code: `
import { useReportError } from '/machinery/ReportError'
import { ImageText } from '/features/pageOnly/ImageText'
      `,
      output: `
import { ImageText } from '/features/pageOnly/ImageText'

import { useReportError } from '/machinery/ReportError'
      `,
      errors: [{ message: messages.unsorted }]
    },
    {
      // Unexpected newline within node package block
      code: `
import config from '@kaliber/config'

import { createFloep } from '@kaliber/flap'
      `,
      output: `
import config from '@kaliber/config'
import { createFloep } from '@kaliber/flap'
      `,
      errors: [{ message: messages.unsorted }]
    },
    {
      // Site.js scenario: Node default/destructured, machinery, and universal component
      code: `
import { useRouting } from '@kaliber/routing'
import config from '@kaliber/config'
import { routeMap } from '/routeMap'
import Preview from '/pages/Preview.universal'
import { Domain } from './pages/Domain'
      `,
      output: `
import config from '@kaliber/config'
import { useRouting } from '@kaliber/routing'

import { Domain } from './pages/Domain'

import Preview from '/pages/Preview.universal'

import { routeMap } from '/routeMap'
      `,
      errors: [{ message: messages.unsorted }]
    },
    {
      // Content.js scenario: Node, machinery, component, universal component, and style
      code: `
import { routeMap } from '/routeMap'
import { useLocation } from '@kaliber/routing'
import { ColleagueContactCard } from '/features/pageOnly/ColleagueContactCard'
import styles from './Content.css'
import CtaSmall from '/features/pageOnly/CtaSmall.universal'
      `,
      output: `
import { useLocation } from '@kaliber/routing'

import { ColleagueContactCard } from '/features/pageOnly/ColleagueContactCard'
import CtaSmall from '/features/pageOnly/CtaSmall.universal'

import { routeMap } from '/routeMap'

import styles from './Content.css'
      `,
      errors: [{ message: messages.unsorted }]
    },
    {
      // Rabobank Content.js scenario: Node, machinery, and various component types
      code: `
import { CONTENT_TYPE_BIOGRAPHIES } from '/pages/Techblog'
import { useLocationMatch } from '@kaliber/routing'
import { AlignContentRight } from '/features/buildingBlocks/AlignContent'
import RewardCalculatorContent from '/features/buildingBlocks/reward-calculator/RewardCalculatorContent.universal'
      `,
      output: `
import { useLocationMatch } from '@kaliber/routing'

import { CONTENT_TYPE_BIOGRAPHIES } from '/pages/Techblog'

import { AlignContentRight } from '/features/buildingBlocks/AlignContent'
import RewardCalculatorContent from '/features/buildingBlocks/reward-calculator/RewardCalculatorContent.universal'
      `,
      errors: [{ message: messages.unsorted }]
    },
    {
      // Side-effect import present → reports error but fix returns null
      // (reordering could silently drop the side-effect import)
      code: `
import './reset.css'
import config from '@kaliber/config'
      `,
      output: null,
      errors: [{ message: messages.unsorted }]
    }
  ]
})
