const {
  spawn
} = require('child_process');
const path = require('path');
const fs = require('fs');

const rulesDir = path.resolve(__dirname, '../rules');
const oxlintPath = path.resolve(__dirname, '../node_modules/.bin/oxlint');

fs.readdirSync(rulesDir).forEach(rule => {
  const ruleDir = path.resolve(rulesDir, rule);
  const testFile = path.resolve(ruleDir, 'test.js');
  if (fs.existsSync(testFile)) {
    console.log(`Running tests for ${rule}...`);
    const oxlint = spawn(oxlintPath, ['--config', '.oxlintrc.json', testFile]);

    oxlint.stdout.on('data', (data) => {
      console.log(data.toString());
    });

    oxlint.stderr.on('data', (data) => {
      console.error(data.toString());
    });

    oxlint.on('close', (code) => {
      console.log(`Tests for ${rule} finished with code ${code}`);
    });
  }
});
