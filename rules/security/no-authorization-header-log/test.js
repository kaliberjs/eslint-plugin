const { test, merge } = require('../../../machinery/test')

const handler = code => `function handler(req, res) { ${code} }`

test('security-no-authorization-header-log', merge(
  {
    valid: [
      // Named, non-sensitive fields are the remediation.
      handler('console.log(req.params.id)'),
      // An outgoing request the app constructed itself has no client
      // credentials; the root name gates this slice deliberately.
      handler('console.log(outgoingConfig.headers)'),
      // Not a logger call at all.
      handler('cache.set(key, req.headers)'),
      // A non-request object that merely has a `headers` property.
      handler('console.log(proxyResponse.headers)'),
    ],
    invalid: [
      {
        code: handler('console.log(req.headers)'),
        errors: [{ messageId: 'credentialLog' }],
      },
      {
        code: handler('logger.info(request.headers)'),
        errors: [{ messageId: 'credentialLog' }],
      },
      {
        code: handler('logger.debug(req.cookies)'),
        errors: [{ messageId: 'credentialLog' }],
      },
      {
        // A single credential is still a credential in the log stream.
        code: handler('console.error(`auth failed`, req.headers.authorization)'),
        errors: [{ messageId: 'credentialLog' }],
      },
      {
        code: handler("console.warn(headers['x-api-key'])"),
        errors: [{ messageId: 'credentialLog' }],
      },
      {
        // Lambda event objects.
        code: handler('console.log(JSON.stringify(event.headers))'),
        errors: [{ messageId: 'credentialLog' }],
      },
    ],
  },

  {
    valid: [],
    invalid: [],
  },
))
