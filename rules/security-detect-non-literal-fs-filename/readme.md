# Detect non-literal fs filename

Flags `fs` method calls where the filename argument is not a static string literal. Dynamic filenames built from user input can enable **path traversal attacks**, allowing access to files outside the intended directory.

Tracks `fs` bindings from `require('fs')`, `require('node:fs')`, `require('fs/promises')`, `require('node:fs/promises')`, `require('fs-extra')`, and their `import` equivalents.

## Examples

Examples of *correct* code for this rule:

```js
const fs = require('fs')
fs.readFile('./data.json', cb)
fs.readFile(__dirname + '/data.json', cb)
```

```js
import fs from 'fs'
fs.readFile('/etc/hosts', cb)
```

Examples of *incorrect* code for this rule:

```js
const fs = require('fs')
fs.readFile(userInput, cb)
fs.writeFile(filename, data, cb)
```
