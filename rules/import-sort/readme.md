# Import sort

Enforce a specific sorting of imports. This rule ensures that imports are grouped and separated by newlines according to the following order:

1.  **Node packages without destructuring**: e.g., `import config from '@kaliber/config'`.
2.  **Node packages with destructuring**: e.g., `import { createFloep } from '@kaliber/flap'`.
3.  **Machinery functions**: Imports from `/machinery/`.
4.  **Components**: Imports from `/features/` or components that end in `.universal`.

*Whitespace*

5.  **Style imports**: Imports that end in `.css`.

*Whitespace*

6.  **Asset imports**: Imports that end in `.svg`, `.raw.svg`, `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`, or `.riv`.

The rule enforces NO newlines between groups 1, 2, 3, and 4. It enforces a single newline before styles and before assets.

## Examples

Example of *correct* code for this rule:

```javascript
import config from '@kaliber/config'
import { createFloep } from '@kaliber/flap'
import { useReportError } from '/machinery/ReportError'
import { ImageText } from '/features/pageOnly/ImageText'

import styles from './Content.css'

import Instagram from '/images/icons/instagram.raw.svg'
```

Example of *incorrect* code for this rule:

```javascript
import { createFloep } from '@kaliber/flap'
import config from '@kaliber/config'
```

```javascript
import { ImageText } from '/features/pageOnly/ImageText'
import styles from './Content.css' // Missing newline
```
