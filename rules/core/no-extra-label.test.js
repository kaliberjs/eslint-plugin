const test = require('node:test');

test('no-extra-label', { todo: 'This rule is problematic to test. It appears to have a bug in ESLint v7 where it incorrectly flags valid labels as unnecessary.' });
