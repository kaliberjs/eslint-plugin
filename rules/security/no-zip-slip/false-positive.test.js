const { test, merge } = require('../../../machinery/test')

/**
 * False-positive corpus for no-zip-slip: legitimate archive handling, and
 * code that merely looks like it, all of which must stay quiet.
 *
 * The first block is the reason this rule exists in this shape. It is the
 * real code from landal-jobs/scripts/download-location-info.js — a
 * stream-parsed remote ZIP where one known entry is matched by name and
 * every other entry is drained. No entry's own name is ever used as a
 * filesystem destination, so there is no sink to report, and the rule has
 * to see that structurally rather than be talked out of it afterwards.
 */
test('security-no-zip-slip', merge(
  {
    // --- the landal-jobs shape ----------------------------------------------
    valid: [
      `
        const unzipper = require('unzipper')

        async function downloadAndExtractCsv(url, csvFilename) {
          const response = await fetch(url)
          const buffer = await response.arrayBuffer()
          const zipParser = unzipper.Parse()

          return new Promise((resolve, reject) => {
            let resolved = false

            zipParser.on('entry', entry => {
              if (entry.path === csvFilename) {
                resolved = true
                resolve(entry)
              } else {
                entry.autodrain()
              }
            })

            zipParser.on('finish', () => {
              if (!resolved) reject(new Error('CSV file not found in ZIP'))
            })

            zipParser.on('error', reject)

            const { Readable } = require('stream')
            Readable.from(Buffer.from(buffer)).pipe(zipParser)
          })
        }
      `,

      // The same idea, matched by regex, then parsed in memory.
      `
        import unzipper from 'unzipper'
        stream.pipe(unzipper.Parse()).on('entry', entry => {
          if (/\\.csv$/.test(entry.path)) entry.pipe(parseCsv())
          else entry.autodrain()
        })
      `,

      // Reading the entry into a buffer, or logging its name. Neither is a
      // filesystem write.
      `
        zip.on('entry', async entry => {
          const content = await entry.buffer()
          console.log('read', entry.path, content.length)
          rows.push(JSON.parse(content.toString()))
        })
      `,

      // Writing to a destination the application chose, with the entry name
      // used only to decide whether to write at all.
      `
        zip.on('entry', entry => {
          if (entry.path !== 'locations.csv') return entry.autodrain()
          entry.pipe(fs.createWriteStream(path.join(cacheDir, 'locations.csv')))
        })
      `,
    ],
    invalid: [],
  },

  {
    // --- containment checks, spelled every plausible way --------------------
    valid: [
      // startsWith against the resolved destination.
      `
        zip.on('entry', entry => {
          const target = path.resolve(dest, entry.path)
          if (!target.startsWith(path.resolve(dest) + path.sep)) return entry.autodrain()
          entry.pipe(fs.createWriteStream(target))
        })
      `,
      // path.relative, the form node-tar and unzipper both use internally.
      `
        zip.on('entry', entry => {
          const target = path.join(dest, entry.path)
          const relative = path.relative(dest, target)
          if (relative === '' || relative.startsWith('..') || path.isAbsolute(relative)) return
          fs.writeFileSync(target, entry.data)
        })
      `,
      // indexOf, the pre-startsWith idiom.
      `
        zip.on('entry', entry => {
          const target = path.resolve(dest, entry.path)
          if (target.indexOf(dest) !== 0) throw new Error('zip slip')
          fs.writeFileSync(target, entry.data)
        })
      `,
      // basename, which throws the directory part away.
      `
        zipfile.on('entry', entry => {
          fs.writeFileSync(path.join(dest, path.basename(entry.fileName)), '')
        })
      `,
      // A helper whose name says it checks. The rule cannot read the
      // helper, and does not try — visibly trying is enough.
      `
        zip.on('entry', entry => {
          const target = safeJoin(dest, entry.path)
          entry.pipe(fs.createWriteStream(target))
        })
      `,
      `
        zip.on('entry', entry => {
          const target = path.join(dest, entry.path)
          assertInsideDirectory(dest, target)
          entry.pipe(fs.createWriteStream(target))
        })
      `,
      `
        zip.on('entry', entry => {
          const target = path.join(dest, sanitizeEntryName(entry.path))
          entry.pipe(fs.createWriteStream(target))
        })
      `,
      // The check in the function that wraps the handler.
      `
        function extract(zip, dest) {
          const isContained = target => path.resolve(target).startsWith(path.resolve(dest) + path.sep)
          zip.on('entry', entry => {
            const target = path.join(dest, entry.path)
            if (isContained(target)) entry.pipe(fs.createWriteStream(target))
          })
        }
      `,
    ],
    invalid: [],
  },

  {
    // --- libraries that containment-check for you ---------------------------
    valid: [
      'stream.pipe(unzipper.Extract({ path: dest }))',
      'unzipper.Open.url(request, url).then(directory => directory.extract({ path: dest, concurrency: 5 }))',
      'new AdmZip(buffer).extractAllTo(dest, /* overwrite */ true)',
      'zip.extractEntryTo(entryName, dest, false, true)',
      "import * as tar from 'tar'; tar.x({ file: archive, cwd: dest })",
      "import * as tar from 'tar'; tar.x({ cwd: dest, strip: 1, filter: name => name.endsWith('.json') })",
      "import * as tar from 'tar'; tar.x({ cwd: dest, onentry: entry => console.log(entry.path) })",
      "import extract from 'extract-zip'; async function run() { await extract(archive, { dir: dest }) }",
      "import decompress from 'decompress'; decompress(archive, dest).then(files => files.length)",
      "async function run() { await zip.extract('subdir/', dest) }",
    ],
    invalid: [],
  },

  {
    // --- not an archive at all ----------------------------------------------
    valid: [
      // Uploaded files: a different rule's territory (no-path-traversal),
      // and multer's own `file.path` is server-generated.
      'req.files.forEach(file => fs.copyFileSync(file.path, path.join(dest, file.originalname)))',
      'for (const file of req.files) fs.writeFileSync(path.join(uploadDir, file.filename), file.buffer)',

      // Directory listings, globs, build output.
      "glob.sync('src/**/*.js').forEach(file => fs.writeFileSync(path.join(out, file), transform(file)))",
      'entries.forEach(entry => fs.writeFileSync(path.join(out, entry.name), entry.contents))',
      'fs.readdirSync(src).forEach(name => fs.copyFileSync(path.join(src, name), path.join(dest, name)))',

      // An 'entry' that is not an archive entry.
      "emitter.on('data', record => fs.writeFileSync(path.join(dest, record.name), record.body))",
      "log.on('line', line => fs.appendFileSync(path.join(dest, line.name), line.text))",

      // Reads. Zip slip is a write.
      `
        zip.on('entry', entry => {
          const existing = fs.readFileSync(path.join(dest, entry.path))
          compare(existing, entry.data)
        })
      `,

      // A write inside an entry handler, to a path the entry did not choose.
      `
        zip.on('entry', entry => {
          fs.writeFileSync(path.join(dest, String(index++) + '.bin'), entry.data)
        })
      `,
      `
        zip.on('entry', entry => {
          fs.writeFileSync(path.join(dest, slugify(record.title)), entry.data)
        })
      `,
    ],
    invalid: [],
  },

  {
    // --- provenance the rule refuses to infer -------------------------------
    // An archive the application produced itself, and a build script
    // unpacking a vendored dependency, are both reported exactly like any
    // other extraction. Where the bytes came from is not statically
    // knowable — the containment check is what makes it safe, and it costs
    // three lines. This is a documented false-positive class.
    valid: [],
    invalid: [
      {
        filename: 'scripts/unpack-vendor.js',
        code: `
          zip.on('entry', entry => {
            entry.pipe(fs.createWriteStream(path.join(vendorDir, entry.path)))
          })
        `,
        errors: [{ messageId: 'zipSlip' }],
      },
    ],
  },
))
