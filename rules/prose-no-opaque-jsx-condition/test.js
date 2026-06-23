const { test } = require('../../machinery/test')

test('prose-no-opaque-jsx-condition', {
  valid: [
    `<div>{isReady && <Panel />}</div>`,
    `<div>{user.active && <Panel />}</div>`,
    `<div>{isReady(user) && <Panel />}</div>`,
    `<div>{!isLoading && <Content />}</div>`,
    `<div>{!disabled && <Button />}</div>`,
    `<div>{value != null && <Display />}</div>`,
    `<div>{isReady ? <Panel /> : <Fallback />}</div>`,
    `<div>{!isReady ? <Loading /> : <Content />}</div>`,
    `const x = a && b && c`,
    `<div>{hasPermissions(user) ? <Admin /> : <Guest />}</div>`,
    `<div>{!user.disabled && <Button />}</div>`,
  ],
  invalid: [
    {
      code: `<div>{user.active && !user.suspended && <Panel />}</div>`,
      errors: [{ messageId: 'opaqueJsxCondition' }],
    },
    {
      code: `<div>{user.profile.settings && <Panel />}</div>`,
      errors: [{ messageId: 'opaqueJsxCondition' }],
    },
    {
      code: `<div>{status === 'active' && <Badge />}</div>`,
      errors: [{ messageId: 'opaqueJsxCondition' }],
    },
    {
      code: `<div>{!user.profile.active && <Warning />}</div>`,
      errors: [{ messageId: 'opaqueJsxCondition' }],
    },
    {
      code: `<div>{user.active && user.verified ? <Panel /> : null}</div>`,
      errors: [{ messageId: 'opaqueJsxCondition' }],
    },
  ],
})
