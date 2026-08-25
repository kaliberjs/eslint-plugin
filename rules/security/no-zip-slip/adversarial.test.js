const { test, merge } = require('../../../machinery/test')

/**
 * Adversarial corpus for no-zip-slip.
 *
 * The rule has no taint flow to attack: it matches a call shape. So the
 * attack surface is the three matchers — where the entry comes from, how
 * the destination is spelled, and what counts as a write — plus the
 * question of how much indirection the rule follows before it gives up.
 *
 * The answer to that last one is: local constants inside the same function
 * are followed to their initialiser, and nothing crosses a function
 * boundary. That is the depth of no-weak-key-size and every other matcher
 * rule here; interprocedural tracing is the taint engine's job, and an
 * archive entry name is not a flow from a request. The misses in the second
 * block are asserted so that a future change has to notice them.
 */
test('security-no-zip-slip', merge(
  {
    // --- evasions that are caught -------------------------------------------
    valid: [],
    invalid: [
      {
        // once / addListener are the same registration.
        code: `
          zip.once('entry', entry => {
            entry.pipe(fs.createWriteStream(path.join(dest, entry.path)))
          })
        `,
        errors: [{ messageId: 'zipSlip' }],
      },
      {
        code: `
          zip.addListener('entry', function (entry) {
            fs.writeFileSync(path.join(dest, entry.path), entry.data)
          })
        `,
        errors: [{ messageId: 'zipSlip' }],
      },
      {
        // The entry name destructured out of the parameter.
        code: `
          zip.on('entry', ({ path: entryPath }) => {
            fs.writeFileSync(join(dest, entryPath), '')
          })
        `,
        errors: [{ messageId: 'zipSlip' }],
      },
      {
        // ... or out of the entry, one statement later.
        code: `
          zip.on('entry', entry => {
            const { fileName } = entry
            fs.writeFileSync(path.join(dest, fileName), '')
          })
        `,
        errors: [{ messageId: 'zipSlip' }],
      },
      {
        // The entry aliased before use.
        code: `
          zip.on('entry', entry => {
            const it = entry
            fs.createWriteStream(path.join(dest, it.path))
          })
        `,
        errors: [{ messageId: 'zipSlip' }],
      },
      {
        // Computed property access.
        code: `
          zip.on('entry', entry => {
            fs.createWriteStream(path.join(dest, entry['path']))
          })
        `,
        errors: [{ messageId: 'zipSlip' }],
      },
      {
        // The join assembled by hand rather than through path.join.
        code: `
          zip.on('entry', entry => {
            fs.createWriteStream(dest + '/' + entry.path)
          })
        `,
        errors: [{ messageId: 'zipSlip' }],
      },
      {
        // A destructured fs, so the callee has no `fs.` in front of it.
        code: `
          const { createWriteStream } = require('fs')
          zip.on('entry', entry => {
            entry.pipe(createWriteStream(path.join(dest, entry.path)))
          })
        `,
        errors: [{ messageId: 'zipSlip' }],
      },
      {
        // The write nested two callbacks deep inside the handler.
        code: `
          zipfile.on('entry', entry => {
            zipfile.openReadStream(entry, (err, stream) => {
              process.nextTick(() => {
                stream.pipe(fs.createWriteStream(path.join(dest, entry.fileName)))
              })
            })
          })
        `,
        errors: [{ messageId: 'zipSlip' }],
      },
      {
        // A ternary picking between two archive-controlled names.
        code: `
          zip.on('entry', entry => {
            fs.writeFileSync(path.join(dest, entry.path || entry.fileName), '')
          })
        `,
        errors: [{ messageId: 'zipSlip' }],
      },
      {
        // normalize() is not containment: '../x' normalizes to '../x'.
        code: `
          zip.on('entry', entry => {
            fs.writeFileSync(path.join(dest, path.normalize(entry.path)), '')
          })
        `,
        errors: [{ messageId: 'zipSlip' }],
      },
      {
        // A chain of local constants between the entry and the write.
        code: `
          zip.on('entry', entry => {
            const name = entry.path
            const target = path.join(dest, name)
            const finalTarget = target
            fs.writeFileSync(finalTarget, '')
          })
        `,
        errors: [{ messageId: 'zipSlip' }],
      },
      {
        // preservePaths through a renamed import.
        code: "import { x as untar } from 'tar'; untar({ file: archive, cwd: dest, preservePaths: true })",
        errors: [{ messageId: 'tarPreservePaths' }],
      },
      {
        code: "const { extract: untar } = require('tar'); untar({ file: archive, cwd: dest, preservePaths: true })",
        errors: [{ messageId: 'tarPreservePaths' }],
      },
      {
        code: "import * as tar from 'tar'; tar.x({ file: archive, cwd: dest, 'preservePaths': true })",
        errors: [{ messageId: 'tarPreservePaths' }],
      },
    ],
  },

  {
    // --- accepted misses ----------------------------------------------------
    valid: [
      // The write wrapped in a same-file helper. The rule reads the call
      // site; it does not follow the entry name into another function.
      `
        function writeTo(target, entry) { entry.pipe(fs.createWriteStream(target)) }
        zip.on('entry', entry => writeTo(path.join(dest, entry.path), entry))
      `,

      // The entry itself handed to a helper.
      `
        function handle(entry) { fs.writeFileSync(path.join(dest, entry.path), '') }
        zip.on('entry', handle)
      `,

      // The entry name parked on an object or in an array first.
      `
        zip.on('entry', entry => {
          const job = { name: entry.path }
          fs.writeFileSync(path.join(dest, job.name), '')
        })
      `,

      // preservePaths held in a variable, or computed — the same miss
      // no-weak-key-size accepts for an options object it cannot read.
      "import * as tar from 'tar'; const options = { file: archive, preservePaths: true }; tar.x(options)",
      "import * as tar from 'tar'; tar.x({ file: archive, preservePaths: config.keepPaths })",

      // An entry from an archive iterated without any recognisable handle
      // on the collection.
      `
        import unzipper from 'unzipper'
        entries.forEach(entry => fs.writeFileSync(path.join(dest, entry.path), ''))
      `,

      // A containment-shaped call anywhere in an enclosing scope silences
      // the finding, even one that does not actually contain anything.
      // Deliberate: see the readme's 'known gaps'. Firing at a developer
      // who visibly tried is the worse failure.
      `
        zip.on('entry', entry => {
          if (entry.path.startsWith('__MACOSX')) return entry.autodrain()
          fs.writeFileSync(path.join(dest, entry.path), '')
        })
      `,
    ],
    invalid: [],
  },
))
