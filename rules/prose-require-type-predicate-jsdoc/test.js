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

    `/** @returns {value is string} */
     function isString(value) { return typeof value === 'string' }`,

    `/** @returns {value is Record<string, unknown>} */
     function isRecord(value) { return typeof value === 'object' && value !== null }`,

    `/** @returns {value is Error} */
     const isError = value => value instanceof Error`,

    `/** @returns {value is WithId} */
     const hasId = value => 'id' in value`,

    `/** @returns {node is Element} */
     const isElementNode = node => node.nodeType === 1`,

    `/** @returns {document is SanityDocument} */
     function isSanityDocument(document) { return document._type === 'article' }`,

    // Non-predicate name — no JSDoc required
    `function getUser(id) { return users[id] }`,

    // Predicate with zero params — type predicates need a subject
    `function isEmpty() { return items.length === 0 }`,

    // Not a function — just a boolean variable (other rule's territory)
    `const isReady = status === 'ready'`,

    // Domain predicates do not narrow an unknown type.
    `function isExpired(subscription) { return subscription.age > 30 }`,
    `function hasItems(collection) { return collection.length > 0 }`,
    `function canEdit(user) { return user.role === 'admin' }`,
    `const isEnabled = feature => feature.enabled`,
    `const isActive = item => item.status === 'active'`,
    `const hasPermissions = user => Boolean(user.permissions)`,
    `const shouldRender = props => props.visible !== false`,
    `function isEmpty(items) { return items.length === 0 }`,
    `function isReady(state) { return state.ready === true }`,
    `function hasAcceptedTerms(form) { return form.acceptedTerms }`,

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
    {
      code: `function isString(value) { return typeof value === 'string' }`,
      errors: [{ messageId: 'missingTypePredicateJsdoc' }],
    },
    {
      code: `const isError = value => value instanceof Error`,
      errors: [{ messageId: 'missingTypePredicateJsdoc' }],
    },
    {
      code: `const hasId = value => 'id' in value`,
      errors: [{ messageId: 'missingTypePredicateJsdoc' }],
    },
    {
      code: `const isTextNode = node => node.type === 'text'`,
      errors: [{ messageId: 'missingTypePredicateJsdoc' }],
    },
    {
      code: `const isSanityDocument = document => document._type === 'article'`,
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
    // Arrow type guard without JSDoc
    {
      code: `const isElement = (x) => x instanceof HTMLElement`,
      errors: [{ messageId: 'missingTypePredicateJsdoc' }],
    },
    // has-prefix type guard without JSDoc
    {
      code: `function hasName(value) { return 'name' in value }`,
      errors: [{ messageId: 'missingTypePredicateJsdoc' }],
    },
    // Arrow with JSDoc but missing type predicate return
    {
      code: `/** Validates the input */
             const isElement = (node) => node instanceof HTMLElement`,
      errors: [{ messageId: 'missingTypePredicateReturn' }],
    },
    // Bogus subject — 'boolean' is not a parameter name
    {
      code: `/** @returns {boolean is fine} */
             function isUser(value) { return value && value.type === 'user' }`,
      errors: [{ messageId: 'missingTypePredicateReturn' }],
    },
    // Detached JSDoc — comment is too far from the function node
    {
      code: `/** @returns {value is User} */\n\n\nfunction isUser(value) { return value && value.type === 'user' }`,
      errors: [{ messageId: 'missingTypePredicateJsdoc' }],
    },
  ],
})
