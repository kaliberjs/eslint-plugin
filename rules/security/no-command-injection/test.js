const { test, merge, handler } = require('../../../machinery/test')

test('security-no-command-injection', merge(
  {
    // --- the vertical slice, all four binding shapes ----------------------
    valid: [
      // A literal command string is the whole point of exec and never a finding.
      handler(`const { exec } = require('child_process'); exec('ls -la /var/www')`),
      handler(`child_process.execSync('git status --porcelain')`),
    ],
    invalid: [
      {
        code: "const { exec } = require('child_process'); function h(req) { exec(`tar czf backup.tgz ${req.query.dir}`) }",
        errors: [{ messageId: 'commandInjectionQualified' }],
      },
    ],
  },

  {
    valid: [],
    invalid: [
      {
        code: "import { exec } from 'child_process'\nexport function handler(req) { exec(`convert ${req.query.file} out.png`) }",
        errors: [{ messageId: 'commandInjectionQualified' }],
      },
      {
        code: "const exec = require('child_process').exec; function h(req) { exec('kill ' + req.query.pid) }",
        errors: [{ messageId: 'commandInjectionQualified' }],
      },
      {
        // Member form on an aliased module namespace.
        code: "import * as cp from 'child_process'; function h(req) { cp.exec(`gzip ${req.query.path}`) }",
        errors: [{ messageId: 'commandInjectionQualified' }],
      },
      {
        // shelljs.
        code: "const sh = require('shelljs'); function h(req) { sh.exec('wc -l ' + req.query.file) }",
        errors: [{ messageId: 'commandInjectionQualified' }],
      },
    ],
  },

  {
    // --- what the fix looks like must stay quiet --------------------------
    valid: [
      // The remediation the message names: execFile/spawn with an argv array.
      // Argument *injection* into a fixed program (CWE-88) is a documented
      // limitation, not something this rule claims to catch.
      handler(`const { execFile } = require('child_process'); execFile('git', ['-c', req.query.name, 'status'])`),
      handler(`spawn('convert', [req.query.file, 'out.png'])`),
      // Closed literal set, proven by membership: the canonical safe way to
      // take a command choice from a request.
      handler(`const { exec } = require('child_process'); const tool = ['gzip', 'bzip2'].includes(req.query.tool) ? req.query.tool : 'cat'; exec(tool + ' file.log')`),
      // A number cannot carry metacharacters.
      handler(`const { exec } = require('child_process'); exec('head -n ' + parseInt(req.query.lines))`),
    ],
    invalid: [],
  },

  {
    // --- propagation -------------------------------------------------------
    valid: [
      // Reading .length yields a number.
      handler(`const { exec } = require('child_process'); exec('fold -w ' + req.query.width.length)`),
    ],
    invalid: [
      // Alias chain through two variables.
      {
        code: "const { exec } = require('child_process'); function h(req) { const raw = req.body.command; const cmd = String(raw); exec(cmd) }",
        errors: [{ messageId: 'commandInjectionQualified' }],
      },
      {
        // Decoding does not sanitize — it re-materializes the payload.
        code: "import { execSync } from 'child_process'; function h(req) { execSync('echo ' + decodeURIComponent(req.query.msg)) }",
        errors: [{ messageId: 'commandInjectionQualified' }],
      },
      {
        // Accumulated onto a literal base with +=. No inexact hop is charged
        // (the compound write is exact), so the plain message fires.
        code: "const { exec } = require('child_process'); function h(req) { let cmd = 'ls '; cmd += req.query.flags; exec(cmd) }",
        errors: [{ messageId: 'commandInjection' }],
      },
    ],
  },
))
