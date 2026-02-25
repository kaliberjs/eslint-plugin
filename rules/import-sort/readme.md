# Import sort

Enforce a specific sorting of imports. This rule ensures that imports are grouped and separated by newlines according to the following order:

1.  **Non-component imports**: Everything else (external libraries, `/machinery/`, etc.).
2.  **Component imports**: Imports from `/features/` that are not universal, styles, or assets.
3.  **Universal component imports**: Imports that end in `.universal`.
4.  **Style imports**: Imports that end in `.css`.
5.  **Asset imports**: Imports that end in `.svg`, `.raw.svg`, `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`, or `.riv`.

The rule also enforces a single newline between groups and NO newlines within a group.

## Examples

Example of *correct* code for this rule:

```javascript
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
```

Example of *incorrect* code for this rule:

```javascript
import { ImageText } from '/features/pageOnly/ImageText'
import { getVideoUrls } from '@kaliber/sanity-video'
```

```javascript
import { getVideoUrls } from '@kaliber/sanity-video'
import { ImageText } from '/features/pageOnly/ImageText'
```
