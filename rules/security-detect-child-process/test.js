const { test } = require('../../machinery/test')

test('security-detect-child-process', {
  valid: [
    // --- exec with literal argument (static) ---
    `const child = require('child_process'); child.exec('ls')`,
    `const child = require('node:child_process'); child.exec('ls')`,
    `import child from 'child_process'; child.exec('ls')`,
    `import child from 'node:child_process'; child.exec('ls')`,

    // --- spawn is safe (not in DANGEROUS_METHODS) ---
    `const child = require('child_process'); child.spawn(cmd)`,
    `const child = require('node:child_process'); child.spawn(cmd)`,
    `import child from 'child_process'; child.spawn(cmd)`,
    `import child from 'node:child_process'; child.spawn(cmd)`,
    `const { spawn } = require('child_process'); spawn(cmd)`,
    `const { spawn } = require('node:child_process'); spawn(cmd)`,
    `import { spawn } from 'child_process'; spawn(cmd)`,
    `import { spawn } from 'node:child_process'; spawn(cmd)`,

    // --- require assigned to variable (not bare) ---
    `const child = require('child_process')`,
    `const child = require('node:child_process')`,

    // --- require accessed via MemberExpression (not bare) ---
    `const exec = require('child_process').exec`,

    // --- Empty destructured import + RegExp.exec (not child_process.exec) ---
    `const {} = require('child_process'); const result = /hello/.exec(str)`,
    `const {} = require('node:child_process'); const result = /hello/.exec(str)`,
    `import {} from 'child_process'; const result = /hello/.exec(str)`,
    `import {} from 'node:child_process'; const result = /hello/.exec(str)`,

    // --- Shadowed variable: regex.exec in inner scope ---
    `const foo = require('child_process'); function fn() { const foo = /hello/; foo.exec(str) }`,

    // --- fork is safe ---
    `const child = require('child_process'); child.fork(script)`,
    `const { fork } = require('child_process'); fork(script)`,

    // --- No arguments ---
    `const child = require('child_process'); child.exec()`,

    // --- Non-child-process package ---
    `const other = require('other'); other.exec(cmd)`,
    `child_process.exec('ls')`,
  ],
  invalid: [
    // --- Bare require('child_process') without assignment ---
    {
      code: `require('child_process')`,
      errors: [{ messageId: 'bareRequire' }],
    },
    {
      code: `require('node:child_process')`,
      errors: [{ messageId: 'bareRequire' }],
    },

    // --- Bare require in argument position (e.g. sinon.stub) ---
    {
      code: `const child = sinon.stub(require('child_process')); child.exec.returns({})`,
      errors: [{ messageId: 'bareRequire' }],
    },
    {
      code: `const child = sinon.stub(require('node:child_process')); child.exec.returns({})`,
      errors: [{ messageId: 'bareRequire' }],
    },

    // --- Basic exec with variable ---
    {
      code: `const child = require('child_process'); child.exec(cmd)`,
      errors: [{ messageId: 'childProcessExec' }],
    },
    {
      code: `const child = require('node:child_process'); child.exec(cmd)`,
      errors: [{ messageId: 'childProcessExec' }],
    },

    // --- Import default + exec ---
    {
      code: `import child from 'child_process'; child.exec(cmd)`,
      errors: [{ messageId: 'childProcessExec' }],
    },
    {
      code: `import child from 'node:child_process'; child.exec(cmd)`,
      errors: [{ messageId: 'childProcessExec' }],
    },

    // --- execSync ---
    {
      code: `const child = require('child_process'); child.execSync(cmd)`,
      errors: [{ messageId: 'childProcessExec' }],
    },
    {
      code: `import child from 'child_process'; child.execSync(cmd)`,
      errors: [{ messageId: 'childProcessExec' }],
    },

    // --- Destructured: const { exec } = require('child_process') ---
    {
      code: `const { exec } = require('child_process'); exec(cmd)`,
      errors: [{ messageId: 'childProcessExec' }],
    },
    {
      code: `const { exec } = require('node:child_process'); exec(cmd)`,
      errors: [{ messageId: 'childProcessExec' }],
    },

    // --- Import named: import { exec } from 'child_process' ---
    {
      code: `import { exec } from 'child_process'; exec(cmd)`,
      errors: [{ messageId: 'childProcessExec' }],
    },

    // --- Standalone binding: const exec = require('child_process').exec ---
    {
      code: `const exec = require('child_process').exec; exec(cmd)`,
      errors: [{ messageId: 'childProcessExec' }],
    },

    // --- Inline require().exec() ---
    {
      code: `require('child_process').exec(cmd)`,
      errors: [{ messageId: 'childProcessExec' }],
    },

    // --- Inside function scope ---
    {
      code: `const foo = require('child_process'); function fn() { foo.exec(cmd) }`,
      errors: [{ messageId: 'childProcessExec' }],
    },
    {
      code: `import foo from 'child_process'; function fn() { foo.exec(cmd) }`,
      errors: [{ messageId: 'childProcessExec' }],
    },
    {
      code: `import foo from 'node:child_process'; function fn() { foo.exec(cmd) }`,
      errors: [{ messageId: 'childProcessExec' }],
    },

    // --- Inline require inside function ---
    {
      code: `function fn() { require('child_process').exec(cmd) }`,
      errors: [{ messageId: 'childProcessExec' }],
    },
  ],
})
