const { messages } = require('./')
const { test } = require('../../machinery/test')

test('import-sort', {
  valid: [
    `
import { getVideoUrls } from '@kaliber/sanity-video'
import { useReportError } from '/machinery/ReportError'
import { useWithGroupedBlocksType } from '/machinery/useWithGroupedBlocksType'

import { ImageText } from '/features/pageOnly/ImageText'
import { FAQ } from '/features/pageOnly/FAQ'
import { ClickthroughCards } from '/features/pageOnly/ClickthroughCards'
import { PortableTextMainContent } from '/features/buildingBlocks/PortableText'

import Image from '/features/buildingBlocks/Image.universal'
import Video from '/features/buildingBlocks/Video.universal'
import ImageCarouselSlider from '/features/buildingBlocks/sliders/ImageCarouselSlider.universal'
import InformationSlider from '/features/buildingBlocks/sliders/InformationSlider.universal'
import CookiePermissions from '/features/pageOnly/CookiePermissions.universal'

import styles from './Content.css'

import Instagram from '/images/icons/instagram.raw.svg'
    `,
  ],
  invalid: [
    {
      // Wrong order
      code: `
import { ImageText } from '/features/pageOnly/ImageText'
import { getVideoUrls } from '@kaliber/sanity-video'
      `,
      output: `
import { getVideoUrls } from '@kaliber/sanity-video'

import { ImageText } from '/features/pageOnly/ImageText'
      `,
      errors: [{ message: messages['unsorted-imports'] }]
    },
    {
      // Missing newline
      code: `
import { getVideoUrls } from '@kaliber/sanity-video'
import { ImageText } from '/features/pageOnly/ImageText'
      `,
      output: `
import { getVideoUrls } from '@kaliber/sanity-video'

import { ImageText } from '/features/pageOnly/ImageText'
      `,
      errors: [{ message: messages['unsorted-imports'] }]
    },
    {
      // Unexpected newline
      code: `
import { getVideoUrls } from '@kaliber/sanity-video'

import { useReportError } from '/machinery/ReportError'
      `,
      output: `
import { getVideoUrls } from '@kaliber/sanity-video'
import { useReportError } from '/machinery/ReportError'
      `,
      errors: [{ message: messages['unsorted-imports'] }]
    },
    {
      // Comments preservation
      code: `
import { FAQ } from '/features/pageOnly/FAQ'
// This is a comment
import { getVideoUrls } from '@kaliber/sanity-video'
      `,
      output: `
// This is a comment
import { getVideoUrls } from '@kaliber/sanity-video'

import { FAQ } from '/features/pageOnly/FAQ'
      `,
      errors: [{ message: messages['unsorted-imports'] }]
    }
  ]
})
