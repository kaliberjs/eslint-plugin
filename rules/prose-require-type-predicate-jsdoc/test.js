const { test } = require('../../machinery/test')

test('prose-require-type-predicate-jsdoc', {
  valid: [
    // Correct type predicate JSDoc on function declaration
    `/** @returns {value is User} */
     function isUser(value) { return value && value.type === 'user' }`,

    // @return alias works too
    `/** @return {x is Element} */
     function isElement(x) { return x instanceof HTMLElement }`,

    // Arrow function with correct JSDoc
    `/** @returns {item is ActiveItem} */
     const isActive = (item) => item.status === 'active'`,

    // Non-predicate name — no JSDoc required
    `function getUser(id) { return users[id] }`,

    // Predicate with zero params — type predicates need a subject
    `function isEmpty() { return items.length === 0 }`,

    // Not a function — just a boolean variable (other rule's territory)
    `const isReady = status === 'ready'`,

    // has-prefix with correct JSDoc
    `/** @returns {obj is WithPermissions} */
     function hasPermissions(obj) { return Boolean(obj.permissions) }`,

    // can-prefix
    `/** @returns {user is AdminUser} */
     function canEdit(user) { return user.role === 'admin' }`,

    // Function expression assigned to variable
    `/** @returns {node is TextNode} */
     const isTextNode = function(node) { return node.type === 'text' }`,
  ],
  invalid: [
    // No JSDoc at all
    {
      code: `function isUser(value) { return value && value.type === 'user' }`,
      errors: [{ messageId: 'missingTypePredicateJsdoc' }],
    },
    // JSDoc present but no @returns
    {
      code: `/** Checks if value is a user */
             function isUser(value) { return value && value.type === 'user' }`,
      errors: [{ messageId: 'missingTypePredicateReturn' }],
    },
    // @returns {boolean} instead of type predicate
    {
      code: `/** @returns {boolean} */
             function isUser(value) { return value && value.type === 'user' }`,
      errors: [{ messageId: 'missingTypePredicateReturn' }],
    },
    // Arrow function without JSDoc
    {
      code: `const isValid = (x) => x !== null`,
      errors: [{ messageId: 'missingTypePredicateJsdoc' }],
    },
    // has-prefix without JSDoc
    {
      code: `function hasItems(collection) { return collection.length > 0 }`,
      errors: [{ messageId: 'missingTypePredicateJsdoc' }],
    },
    // Arrow with JSDoc but missing type predicate return
    {
      code: `/** Validates the input */
             const isEnabled = (feature) => feature.enabled`,
      errors: [{ messageId: 'missingTypePredicateReturn' }],
    },
  ],
})
