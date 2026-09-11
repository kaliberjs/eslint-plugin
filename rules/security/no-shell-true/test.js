const { test, merge } = require('../../../machinery/test')

test('security-no-shell-true', merge(
  {
    valid: [
      // The safe API used as intended.
      'spawn(command, args)',
      'execFile(git, ["status"])',
      'spawnSync(cmd, args, { cwd, stdio: "inherit" })',
      // shell explicitly false.
      'spawn(command, args, { shell: false })',
      // Options from a variable: known false negative.
      'spawn(command, args, options)',
    ],
    invalid: [
      {
        code: 'spawn(command, args, { shell: true })',
        errors: [{ messageId: 'shellTrue' }],
      },
      {
        // Computed key spelling — found by the adversarial pass.
        code: "spawn(cmd, args, { ['shell']: true })",
        errors: [{ messageId: 'shellTrue' }],
      },
      {
        code: 'child_process.spawnSync(cmd, args, { shell: "/bin/bash" })',
        errors: [{ messageId: 'shellTrue' }],
      },
      {
        code: 'execFile(command, args, env, { shell: true })',
        errors: [{ messageId: 'shellTrue' }],
      },
      {
        code: 'async function run() { await execa(command, args, { shell: true }) }',
        errors: [{ messageId: 'shellTrue' }],
      },
    ],
  },

  {
    // The Windows `.cmd` workaround is the main deliberate use; it stays
    // flagged. Pinning that keeps the trade-off visible instead of silent.
    valid: [],
    invalid: [
      {
        code: 'spawn(npmCmd, args, { shell: true }) // windows shim',
        errors: [{ messageId: 'shellTrue' }],
      },
    ],
  },
))
