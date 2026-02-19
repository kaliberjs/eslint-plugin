const { test } = require('../../machinery/test')

const options = [{ projectKeys: ['LAN'] }]
const multiKeyOptions = [{ projectKeys: ['LAN', 'CORE'] }]

test('todo-ticket-reference', {
  valid: [
    // With parentheses
    { code: '// TODO (LAN-123): fix this', options },
    { code: '/* TODO (LAN-456): refactor */', options },

    // Without parentheses
    { code: '// TODO LAN-789: do something', options },
    { code: '/* TODO LAN-1: short */', options },

    // Case insensitive TODO
    { code: '// todo (LAN-42): lowercase', options },
    { code: '// Todo (LAN-42): mixed case', options },

    // Non-TODO comments are not affected
    { code: '// FIXME: no ticket needed', options },
    { code: '// HACK: this is fine', options },
    { code: '// NOTE: just a note', options },
    { code: '// regular comment', options },
    { code: '/* block comment */', options },

    // Multiple project keys
    { code: '// TODO (LAN-1): landal ticket', options: multiKeyOptions },
    { code: '// TODO (CORE-99): core ticket', options: multiKeyOptions },
  ],
  invalid: [
    // No ticket at all
    {
      code: '// TODO fix this',
      options,
      errors: [{ messageId: 'missingTicket' }],
    },
    {
      code: '// TODO: fix this',
      options,
      errors: [{ messageId: 'missingTicket' }],
    },
    {
      code: '/* TODO blah blah */',
      options,
      errors: [{ messageId: 'missingTicket' }],
    },

    // Case insensitive detection
    {
      code: '// todo something',
      options,
      errors: [{ messageId: 'missingTicket' }],
    },
    {
      code: '// Todo: something',
      options,
      errors: [{ messageId: 'missingTicket' }],
    },

    // Wrong project key
    {
      code: '// TODO (WRONG-1): bad key',
      options,
      errors: [{ messageId: 'missingTicket' }],
    },

    // Missing colon after ticket
    {
      code: '// TODO (LAN-123) fix this',
      options,
      errors: [{ messageId: 'missingTicket' }],
    },

    // Block comment
    {
      code: '/* TODO: needs work */',
      options,
      errors: [{ messageId: 'missingTicket' }],
    },
  ],
})
