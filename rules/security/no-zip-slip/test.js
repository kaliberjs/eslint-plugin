const { test, merge } = require('../../../machinery/test')

test('security-no-zip-slip', merge(
  {
    // --- unzipper: Parse() + 'entry' -----------------------------------------
    valid: [
      // The library's own extraction, which containment-checks internally
      // (unzipper >= 0.10.14).
      'stream.pipe(unzipper.Extract({ path: dest }))',
      'unzipper.Open.file(archive).then(directory => directory.extract({ path: dest }))',

      // Resolved and checked before writing.
      `
        stream.pipe(unzipper.Parse()).on('entry', entry => {
          const target = path.join(dest, entry.path)
          if (!target.startsWith(dest + path.sep)) return entry.autodrain()
          entry.pipe(fs.createWriteStream(target))
        })
      `,
      // path.relative form.
      `
        zip.on('entry', entry => {
          const target = path.resolve(dest, entry.path)
          const relative = path.relative(dest, target)
          if (relative.startsWith('..') || path.isAbsolute(relative)) return entry.autodrain()
          entry.pipe(fs.createWriteStream(target))
        })
      `,
      // basename discards the directory part entirely.
      `
        zip.on('entry', entry => {
          entry.pipe(fs.createWriteStream(path.join(dest, path.basename(entry.path))))
        })
      `,
    ],
    invalid: [
      {
        code: `
          stream.pipe(unzipper.Parse()).on('entry', entry => {
            entry.pipe(fs.createWriteStream(path.join(dest, entry.path)))
          })
        `,
        errors: [{ messageId: 'zipSlip' }],
      },
      {
        // The join held in a variable first.
        code: `
          stream.pipe(unzipper.Parse()).on('entry', entry => {
            const target = path.join(dest, entry.path)
            entry.pipe(fs.createWriteStream(target))
          })
        `,
        errors: [{ messageId: 'zipSlip' }],
      },
      {
        // unzipper's Open.* API, extracted by hand instead of via extract().
        code: `
          import unzipper from 'unzipper'
          unzipper.Open.file(archive).then(directory => {
            directory.files.forEach(file => {
              fs.writeFileSync(path.join(dest, file.path), file.buffer())
            })
          })
        `,
        errors: [{ messageId: 'zipSlip' }],
      },
      {
        code: `
          import unzipper from 'unzipper'
          async function extractAll() {
            const directory = await unzipper.Open.buffer(buffer)
            for (const file of directory.files) {
              fs.writeFileSync(path.join(dest, file.path), await file.buffer())
            }
          }
        `,
        errors: [{ messageId: 'zipSlip' }],
      },
    ],
  },

  {
    // --- yauzl ---------------------------------------------------------------
    valid: [
      `
        yauzl.open(archive, { lazyEntries: true }, (err, zipfile) => {
          zipfile.on('entry', entry => {
            const target = path.join(dest, entry.fileName)
            if (!target.startsWith(path.resolve(dest) + path.sep)) return zipfile.readEntry()
            zipfile.openReadStream(entry, (err, stream) => stream.pipe(fs.createWriteStream(target)))
          })
        })
      `,
    ],
    invalid: [
      {
        code: `
          yauzl.open(archive, { lazyEntries: true }, (err, zipfile) => {
            zipfile.on('entry', entry => {
              zipfile.openReadStream(entry, (err, stream) => {
                stream.pipe(fs.createWriteStream(path.join(dest, entry.fileName)))
              })
            })
          })
        `,
        errors: [{ messageId: 'zipSlip' }],
      },
      {
        // mkdir for the directory entries is a write too.
        code: `
          zipfile.on('entry', entry => {
            fs.mkdirSync(path.join(dest, entry.fileName), { recursive: true })
          })
        `,
        errors: [{ messageId: 'zipSlip' }],
      },
    ],
  },

  {
    // --- adm-zip -------------------------------------------------------------
    valid: [
      // The library's own extraction sanitises internally (>= 0.5.2).
      'new AdmZip(archive).extractAllTo(dest, true)',
      "zip.extractEntryTo('report.csv', dest, false, true)",
      `
        zip.getEntries().forEach(entry => {
          fs.writeFileSync(path.join(dest, path.basename(entry.entryName)), entry.getData())
        })
      `,
    ],
    invalid: [
      {
        code: `
          import AdmZip from 'adm-zip'
          const zip = new AdmZip(archive)
          zip.getEntries().forEach(entry => {
            fs.writeFileSync(path.join(dest, entry.entryName), entry.getData())
          })
        `,
        errors: [{ messageId: 'zipSlip' }],
      },
    ],
  },

  {
    // --- node-stream-zip -----------------------------------------------------
    valid: [
      'async function run() { await zip.extract(null, dest) }',
      // Entry name validation is on by default (>= 1.4.0).
      'const zip = new StreamZip({ file: archive, storeEntries: true })',
    ],
    invalid: [
      {
        // The switch that turns that validation off.
        code: 'const zip = new StreamZip({ file: archive, skipEntryNameValidation: true })',
        errors: [{ messageId: 'skipEntryNameValidation' }],
      },
      {
        code: `
          zip.on('entry', entry => {
            fs.writeFileSync(path.join(dest, entry.name), zip.entryDataSync(entry))
          })
        `,
        errors: [{ messageId: 'zipSlip' }],
      },
    ],
  },

  {
    // --- tar -----------------------------------------------------------------
    valid: [
      // Bare extraction is safe: node-tar strips absolute paths and refuses
      // `..` entries unless told otherwise.
      "import * as tar from 'tar'; tar.x({ file: archive, cwd: dest })",
      "import * as tar from 'tar'; tar.extract({ file: archive, cwd: dest, strip: 1 })",
      "const tar = require('tar'); tar.x({ file: archive, cwd: dest })",

      // The opt-out, with the author's own check alongside it.
      "import * as tar from 'tar'; tar.x({ file: archive, cwd: dest, preservePaths: true, filter: p => !path.isAbsolute(p) && !p.includes('..') })",

      // Same option name, not node-tar.
      'archiver.x({ preservePaths: true })',
      // Nothing proves this is node-tar, and `x` is one letter.
      'tar.x({ file: archive, cwd: dest, preservePaths: true })',
      "const tar = require('./our-tar-wrapper'); tar.x({ cwd: dest, preservePaths: true })",
      'tar.c({ preservePaths: true, cwd: src }, files)',
    ],
    invalid: [
      {
        code: "import * as tar from 'tar'; tar.x({ file: archive, cwd: dest, preservePaths: true })",
        errors: [{ messageId: 'tarPreservePaths' }],
      },
      {
        code: "import { x } from 'node:tar'; export const done = x({ file: archive, cwd: dest, preservePaths: true })",
        errors: [{ messageId: 'tarPreservePaths' }],
      },
      {
        code: "import { extract as untar } from 'tar'; export const done = untar({ file: archive, cwd: dest, preservePaths: true })",
        errors: [{ messageId: 'tarPreservePaths' }],
      },
      {
        code: "const { x } = require('tar'); x({ file: archive, cwd: dest, preservePaths: true })",
        errors: [{ messageId: 'tarPreservePaths' }],
      },
      {
        code: "const tar = require('tar'); tar.extract({ file: archive, cwd: dest, preservePaths: true })",
        errors: [{ messageId: 'tarPreservePaths' }],
      },
      {
        // `onentry` / `onReadEntry` cannot refuse an entry — node-tar calls
        // them with entries that already passed the filter — so they do not
        // count as the author's own check.
        code: "import * as tar from 'tar'; tar.x({ file: archive, cwd: dest, preservePaths: true, onentry: entry => check(entry.path) })",
        errors: [{ messageId: 'tarPreservePaths' }],
      },
      {
        // The single-letter alias.
        code: "import * as tar from 'tar'; tar.x({ file: archive, cwd: dest, P: true })",
        errors: [{ messageId: 'tarPreservePaths' }],
      },
      {
        // An onentry handler that writes the entry's own path itself.
        code: `
          import * as tar from 'tar'
          tar.x({ file: archive, cwd: dest, onentry: entry => {
            fs.writeFileSync(path.join(dest, entry.path), '')
          } })
        `,
        errors: [{ messageId: 'zipSlip' }],
      },
      {
        // tar-stream: the entry name lives on the header.
        code: `
          extract.on('entry', (header, stream, next) => {
            stream.pipe(fs.createWriteStream(path.join(dest, header.name)))
          })
        `,
        errors: [{ messageId: 'zipSlip' }],
      },
    ],
  },

  {
    // --- the write, spelled differently --------------------------------------
    valid: [],
    invalid: [
      {
        code: `
          zip.on('entry', entry => {
            fs.writeFile(dest + '/' + entry.path, entry.data, () => {})
          })
        `,
        errors: [{ messageId: 'zipSlip' }],
      },
      {
        code: `
          zip.on('entry', entry => {
            fs.writeFileSync(\`\${dest}/\${entry.path}\`, entry.data)
          })
        `,
        errors: [{ messageId: 'zipSlip' }],
      },
      {
        code: `
          zip.on('entry', entry => {
            fse.outputFileSync(path.resolve(dest, entry.path), entry.data)
          })
        `,
        errors: [{ messageId: 'zipSlip' }],
      },
      {
        code: `
          zip.on('entry', async entry => {
            await fs.promises.writeFile(path.join(dest, entry.path), await entry.buffer())
          })
        `,
        errors: [{ messageId: 'zipSlip' }],
      },
      {
        // copy/move/rename write to their *second* argument.
        code: `
          zip.on('entry', entry => {
            fs.copyFileSync(entry.temporaryFile, path.join(dest, entry.path))
          })
        `,
        errors: [{ messageId: 'zipSlip' }],
      },
      {
        code: `
          zip.on('entry', entry => {
            fs.renameSync(staging, path.join(dest, entry.path))
          })
        `,
        errors: [{ messageId: 'zipSlip' }],
      },
    ],
  },
))
