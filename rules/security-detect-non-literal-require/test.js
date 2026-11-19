const { test } = require('../../machinery/test')

test('security-detect-non-literal-require', {
  valid: [
    // === String literal (most common) ===
    `require('fs')`,
    `require('path')`,
    `require('./module')`,
    `require('../utils/helper')`,
    `require('@scope/package')`,

    // === Template literal without expressions ===
    'require(`./static-module`)',
    'require(`fs`)',

    // === __dirname / __filename ===
    `require(__dirname)`,
    `require(__filename)`,

    // === Binary expression of static parts ===
    `require(__dirname + '/module')`,
    `require('./base' + '/sub')`,
    `require(__dirname + '/' + 'file.js')`,
    `require(__filename + '.map')`,

    // === import.meta variants (static MemberExpression) ===
    `require(import.meta.url)`,
    `require(import.meta.dirname)`,
    `require(import.meta.filename)`,

    // === Numeric literal (weird but static) ===
    `require(42)`,

    // === No arguments — should not trigger ===
    `require()`,

    // === Not named require — should not trigger ===
    `myRequire(variable)`,
    `load(variable)`,
    `importModule(variable)`,

    // === Member expression callee — rule only checks Identifier ===
    `module.require(variable)`,
    `global.require(variable)`,

    // === import statement (not require call) ===
    `import fs from 'fs'`,
    `import { readFile } from 'fs'`,

    // === Dynamic import (not a require call) ===
    `import(variable)`,
  ],
  invalid: [
    // === Variable identifier ===
    {
      code: `require(variable)`,
      errors: [{ messageId: 'nonLiteralRequire' }],
    },
    // === Function call as argument ===
    {
      code: `require(getModule())`,
      errors: [{ messageId: 'nonLiteralRequire' }],
    },
    {
      code: `require(computePath())`,
      errors: [{ messageId: 'nonLiteralRequire' }],
    },
    // === Template literal WITH expressions ===
    {
      code: 'require(`${moduleName}`)',
      errors: [{ messageId: 'nonLiteralRequire' }],
    },
    {
      code: 'require(`./modules/${name}`)',
      errors: [{ messageId: 'nonLiteralRequire' }],
    },
    // === Binary expression with non-static part ===
    {
      code: `require(name + '.js')`,
      errors: [{ messageId: 'nonLiteralRequire' }],
    },
    {
      code: `require('./dir/' + dynamicName)`,
      errors: [{ messageId: 'nonLiteralRequire' }],
    },
    {
      code: `require(base + '/' + file)`,
      errors: [{ messageId: 'nonLiteralRequire' }],
    },
    // === Member expression as argument (non-static) ===
    {
      code: `require(config.modulePath)`,
      errors: [{ messageId: 'nonLiteralRequire' }],
    },
    {
      code: `require(process.env.MODULE)`,
      errors: [{ messageId: 'nonLiteralRequire' }],
    },
    // === Conditional expression ===
    {
      code: `require(isDev ? './dev' : moduleName)`,
      errors: [{ messageId: 'nonLiteralRequire' }],
    },
    // === Array access ===
    {
      code: `require(modules[0])`,
      errors: [{ messageId: 'nonLiteralRequire' }],
    },
    // === import.meta with non-whitelisted property ===
    {
      code: `require(import.meta.env)`,
      errors: [{ messageId: 'nonLiteralRequire' }],
    },
    // === Spread in arguments doesn't count as first arg ===
    {
      code: `require(path)`,
      errors: [{ messageId: 'nonLiteralRequire' }],
    },
    // === Multiple errors in one file ===
    {
      code: `require(a)\nrequire(b)`,
      errors: [
        { messageId: 'nonLiteralRequire' },
        { messageId: 'nonLiteralRequire' },
      ],
    },
  ],
})
