const { describe } = require('node:test')
const { test, merge } = require('../../../machinery/test')

const handler = code => `function handler(req, res) { ${code} }`

/**
 * The false-positive corpus. These cases are why the rule exists in this
 * shape and not as `detect-child-process`: every case here is a real
 * pattern from build scripts and CLIs that a noisier rule would report,
 * and each one is quiet for a *reasoned* reason, not an accident.
 */
describe('false-positive corpus', () => test('security-no-command-injection', merge(
  {
    valid: [
      // Developer-supplied paths from config, not from request data: untainted
      // at the source, so nothing to report regardless of how the command
      // is assembled.
      handler(`const { exec } = require('child_process'); const workspace = config.workspaceDir; exec(\`cd \${workspace} && make test\`)`),
      handler(`const { exec } = require('child_process'); exec(\`rsync -a \${SRC}/ \${DEST}/\`)`),

      // CLI arguments sit below the reporting floor on purpose: whoever runs
      // the tool already controls the machine it runs on.
      handler(`const { exec } = require('child_process'); exec(\`node --eval \${process.argv[2]}\`)`),

      // The safe API used exactly as intended.
      handler(`execFile('convert', [req.query.file, 'out.png'])`),
      handler(`spawn('git', ['push', remote])`),

      // shell:true with an entirely literal command: security-no-shell-true
      // owns the option; this rule owns the dataflow, and there is none.
      handler(`spawn('ls', ['-la'], { shell: true })`),

      // Values proven to come from a closed set by membership.
      handler(`const { exec } = require('child_process'); const codec = ['h264', 'vp9'].includes(req.query.codec) ? req.query.codec : 'copy'; exec(\`ffmpeg -c:v \${codec} out.mp4\`)`),
    ],
    invalid: [
      // The same shape as the config-driven valid case above, but the value
      // comes from the request: this is what the rule must NOT go quiet on
      // just because neighbouring code builds commands the same way.
      {
        code: handler(`const { exec } = require('child_process'); const workspace = req.query.workspace; exec(\`cd \${workspace} && make test\`)`),
        errors: [{ messageId: 'commandInjectionQualified' }],
      },
    ],
  },
)))


