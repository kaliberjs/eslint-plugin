const { test } = require('../../machinery/test')

// Written reductions of the rules-file shapes; no client code.
const helpers = `
function hasAuth() { return \`auth != null\` }
function isCreate() { return \`newData.exists() && !data.exists()\` }
`

test('firebase-shadowed-rule', {
  valid: [
    {
      name: 'a closed parent with narrower children',
      code: `module.exports = () => ({ rules: { '.read': false, static: { questionnaires: { '.read': "auth.uid === 'serve'" } } } })`,
    },
    {
      name: 'a child as open as its parent',
      code: `module.exports = () => ({ rules: { static: { '.read': true, skills: { '.read': true } } } })`,
    },
    {
      name: 'a .validate below an open parent, which does not cascade',
      code: `module.exports = () => ({ rules: { queue: { '.write': true, $key: { '.validate': 'newData.hasChildren()' } } } })`,
    },
    {
      name: 'an open sibling is not an ancestor',
      code: `module.exports = () => ({ rules: { public: { '.read': true }, private: { '.read': false } } })`,
    },
    {
      name: 'a parent that grants only on a condition',
      code: `${helpers}
module.exports = () => ({ rules: { queue: { '.write': \`\${hasAuth()} && \${isCreate()}\`, $key: { '.write': false } } } })`,
    },
    {
      name: 'a parent from an option is skipped',
      code: `module.exports = ({ isPublic }) => ({ rules: { static: { '.read': isPublic, questionnaires: { '.read': false } } } })`,
    },
  ],
  invalid: [
    {
      name: 'a service-only read below a public read',
      code: `const isSite = "(auth.uid === 'serve')"
module.exports = () => ({ rules: { static: {
  '.read': true,
  questionnaires: { '.read': isSite },
} } })`,
      errors: [{ messageId: 'shadowed', data: { key: '.read', path: 'static/questionnaires', ancestor: 'static', who: 'anyone' } }],
    },
    {
      name: 'a create-only write below a signed-in write',
      code: `${helpers}
module.exports = () => ({ rules: { 'poll-processing': {
  '.write': hasAuth(),
  entries: { '.write': \`(\${hasAuth()} && \${isCreate()})\` },
} } })`,
      errors: [{ messageId: 'shadowed', data: { key: '.write', path: 'poll-processing/entries', ancestor: 'poll-processing', who: 'any signed-in client' } }],
    },
    {
      name: 'a closed read two levels below a public read',
      code: `module.exports = () => ({ rules: { static: { '.read': true, postcodes: { $code: { '.read': false } } } } })`,
      errors: [{ messageId: 'shadowed', data: { key: '.read', path: 'static/postcodes/$code', ancestor: 'static', who: 'anyone' } }],
    },
    {
      name: 'a public write at the root',
      code: `module.exports = () => ({ rules: { '.write': true, users: { '.write': false } } })`,
      errors: [{ messageId: 'shadowed', data: { key: '.write', path: 'users', ancestor: 'the root', who: 'anyone' } }],
    },
  ],
})
