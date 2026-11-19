const { test } = require('../../machinery/test')

test('security-detect-non-literal-fs-filename', {
  valid: [
    // --- Literal filename (static) ---
    `import fs from 'fs'; fs.readFile('test.txt', cb)`,
    `import fs from 'fs'; fs.readFileSync('test.txt')`,
    `import fs from 'node:fs'; fs.writeFile('out.txt', data, cb)`,

    // --- Template literal without expressions ---
    'import fs from "fs"; fs.readFile(`test.txt`, cb)',

    // --- __dirname / __filename (static) ---
    `import fs from 'fs'; fs.readFile(__dirname, cb)`,
    `import fs from 'fs'; fs.readFile(__filename, cb)`,

    // --- BinaryExpression with static operands ---
    `import fs from 'fs'; fs.readFile(__dirname + '/test.txt', cb)`,
    `import fs from 'fs'; fs.readFile('prefix' + '/test.txt', cb)`,

    // --- import.meta.url / dirname / filename ---
    `import fs from 'fs'; fs.readFile(import.meta.url, cb)`,
    `import fs from 'fs'; fs.readFile(import.meta.dirname, cb)`,
    `import fs from 'fs'; fs.readFile(import.meta.filename, cb)`,

    // --- Non-fs package (should not trigger) ---
    `import http from 'http'; http.readFile(variable)`,
    `import other from 'other'; other.readFile(variable)`,
    `const something = require('some'); something.readFile(variable)`,

    // --- require('fs') with Identifier binding + static arg ---
    `const fs = require('fs'); fs.readFile('test.txt', cb)`,
    `const fs = require('node:fs'); fs.readFileSync('test.txt')`,

    // --- No arguments ---
    `const fs = require('fs'); fs.readFile()`,

    // --- Destructured require with non-fs import reading ---
    `const readFile = require('foo').readFile; readFile(variable)`,

    // --- Sync methods with static args ---
    `const fs = require('fs'); fs.readFileSync('test.txt')`,
    `const fs = require('fs'); fs.writeFileSync('out.txt', data)`,
    `const fs = require('fs'); fs.accessSync('test.txt')`,

    // --- Non-fs method name ---
    `const fs = require('fs'); fs.customMethod(variable)`,

    // --- All 5 fs package names with static args ---
    `const fs = require('fs'); fs.readFile('a', cb)`,
    `const fs = require('node:fs'); fs.readFile('a', cb)`,
    `const fs = require('fs/promises'); fs.readFile('a')`,
    `const fs = require('node:fs/promises'); fs.readFile('a')`,
    `const fs = require('fs-extra'); fs.readFile('a')`,

    // --- import * as ns ---
    `import * as fs from 'fs'; fs.readFile('test.txt', cb)`,
    `import * as fs from 'node:fs'; fs.readFile('test.txt', cb)`,
  ],
  invalid: [
    // --- Basic: variable filename ---
    {
      code: `import fs from 'fs'; fs.readFile(filename, cb)`,
      errors: [{ messageId: 'nonLiteralFsFilename' }],
    },
    {
      code: `import fs from 'fs'; fs.readFileSync(filename)`,
      errors: [{ messageId: 'nonLiteralFsFilename' }],
    },

    // --- All 5 fs packages ---
    {
      code: `const fs = require('fs'); fs.readFile(x, cb)`,
      errors: [{ messageId: 'nonLiteralFsFilename' }],
    },
    {
      code: `const fs = require('node:fs'); fs.readFile(x, cb)`,
      errors: [{ messageId: 'nonLiteralFsFilename' }],
    },
    {
      code: `const fs = require('fs/promises'); fs.readFile(x)`,
      errors: [{ messageId: 'nonLiteralFsFilename' }],
    },
    {
      code: `const fs = require('node:fs/promises'); fs.readFile(x)`,
      errors: [{ messageId: 'nonLiteralFsFilename' }],
    },
    {
      code: `const fs = require('fs-extra'); fs.readFile(x)`,
      errors: [{ messageId: 'nonLiteralFsFilename' }],
    },

    // --- Import default + non-literal ---
    {
      code: `import fs from 'node:fs'; fs.writeFile(file, data, cb)`,
      errors: [{ messageId: 'nonLiteralFsFilename' }],
    },

    // --- import * as namespace ---
    {
      code: `import * as fs from 'fs'; fs.readFile(filename, cb)`,
      errors: [{ messageId: 'nonLiteralFsFilename' }],
    },
    {
      code: `import * as fs from 'node:fs'; fs.readFile(filename, cb)`,
      errors: [{ messageId: 'nonLiteralFsFilename' }],
    },

    // --- Destructured require: const { readFile: something } = require('fs') ---
    {
      code: `const { readFile: something } = require('fs'); something(filename)`,
      errors: [{ messageId: 'nonLiteralFsFilename' }],
    },

    // --- Import named: import { readFile as something } from 'fs' ---
    {
      code: `import { readFile as something } from 'fs'; something(filename)`,
      errors: [{ messageId: 'nonLiteralFsFilename' }],
    },
    {
      code: `import { readFile as something } from 'node:fs'; something(filename)`,
      errors: [{ messageId: 'nonLiteralFsFilename' }],
    },
    {
      code: `import { readFile as something } from 'fs-extra'; something(filename)`,
      errors: [{ messageId: 'nonLiteralFsFilename' }],
    },
    {
      code: `import { readFile as something } from 'fs/promises'; something(filename)`,
      errors: [{ messageId: 'nonLiteralFsFilename' }],
    },
    {
      code: `import { readFile as something } from 'node:fs/promises'; something(filename)`,
      errors: [{ messageId: 'nonLiteralFsFilename' }],
    },

    // --- Standalone binding: const readFile = require('fs').readFile ---
    {
      code: `const one = require('fs').readFile; one(filename)`,
      errors: [{ messageId: 'nonLiteralFsFilename' }],
    },
    {
      code: `const one = require('node:fs').readFile; one(filename)`,
      errors: [{ messageId: 'nonLiteralFsFilename' }],
    },

    // --- .promises chain: require('fs').promises.readFile ---
    {
      code: `const p = require('fs').promises; p.readFile(filename)`,
      errors: [{ messageId: 'nonLiteralFsFilename' }],
    },
    {
      code: `const p = require('node:fs').promises; p.readFile(filename)`,
      errors: [{ messageId: 'nonLiteralFsFilename' }],
    },
    {
      code: `const fs = require('fs'); fs.promises.readFile(filename)`,
      errors: [{ messageId: 'nonLiteralFsFilename' }],
    },
    {
      code: `const fs = require('node:fs'); fs.promises.readFile(filename)`,
      errors: [{ messageId: 'nonLiteralFsFilename' }],
    },

    // --- Inline require().method() ---
    {
      code: `require('fs').readFile(filename, cb)`,
      errors: [{ messageId: 'nonLiteralFsFilename' }],
    },

    // --- Sync methods ---
    {
      code: `const fs = require('fs'); fs.readFileSync(filename)`,
      errors: [{ messageId: 'nonLiteralFsFilename' }],
    },
    {
      code: `const fs = require('fs'); fs.writeFileSync(filename, data)`,
      errors: [{ messageId: 'nonLiteralFsFilename' }],
    },
    {
      code: `const fs = require('fs'); fs.appendFileSync(filename, data)`,
      errors: [{ messageId: 'nonLiteralFsFilename' }],
    },
    {
      code: `const fs = require('fs'); fs.accessSync(filename)`,
      errors: [{ messageId: 'nonLiteralFsFilename' }],
    },
    {
      code: `const fs = require('fs'); fs.existsSync(filename)`,
      errors: [{ messageId: 'nonLiteralFsFilename' }],
    },
    {
      code: `const fs = require('fs'); fs.statSync(filename)`,
      errors: [{ messageId: 'nonLiteralFsFilename' }],
    },
    {
      code: `const fs = require('fs'); fs.mkdirSync(filename)`,
      errors: [{ messageId: 'nonLiteralFsFilename' }],
    },
    {
      code: `const fs = require('fs'); fs.unlinkSync(filename)`,
      errors: [{ messageId: 'nonLiteralFsFilename' }],
    },
    {
      code: `const fs = require('fs'); fs.readdirSync(filename)`,
      errors: [{ messageId: 'nonLiteralFsFilename' }],
    },
    {
      code: `const fs = require('fs'); fs.rmSync(filename)`,
      errors: [{ messageId: 'nonLiteralFsFilename' }],
    },
    {
      code: `const fs = require('fs'); fs.copyFileSync(filename, dest)`,
      errors: [{ messageId: 'nonLiteralFsFilename' }],
    },
    {
      code: `const fs = require('fs'); fs.renameSync(filename, newName)`,
      errors: [{ messageId: 'nonLiteralFsFilename' }],
    },

    // --- Template literal with expression ---
    {
      code: "const fs = require('fs'); fs.readFile(`${filename}`, cb)",
      errors: [{ messageId: 'nonLiteralFsFilename' }],
    },

    // --- createReadStream / createWriteStream ---
    {
      code: `const fs = require('fs'); fs.createReadStream(filename)`,
      errors: [{ messageId: 'nonLiteralFsFilename' }],
    },
    {
      code: `const fs = require('fs'); fs.createWriteStream(filename)`,
      errors: [{ messageId: 'nonLiteralFsFilename' }],
    },

    // --- Inline require inside function ---
    {
      code: `function foo () { const fs = require('fs'); fs.readFile(filename, cb) }`,
      errors: [{ messageId: 'nonLiteralFsFilename' }],
    },
    {
      code: `function foo () { const { readFile: something } = require('fs'); something(filename) }`,
      errors: [{ messageId: 'nonLiteralFsFilename' }],
    },
  ],
})
