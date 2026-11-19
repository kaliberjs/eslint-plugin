# Detect child_process command injection

Flags `child_process.exec()` and `child_process.execSync()` calls where the command argument is not a static string literal. Dynamic commands built from user input can lead to **command injection** attacks.

Only `exec` and `execSync` are flagged because they run commands through a shell. Methods like `spawn` and `execFile` are safer alternatives since they don't invoke a shell.

## Examples

Examples of *correct* code for this rule:

```js
const cp = require('child_process')
cp.exec('ls -la', cb)
cp.spawn('ls', ['-la'])
```

Examples of *incorrect* code for this rule:

```js
const cp = require('child_process')
cp.exec(userInput, cb)
cp.execSync(cmd)
```
