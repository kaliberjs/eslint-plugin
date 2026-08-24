const { test, merge } = require('../../../machinery/test')

test('security-no-sensitive-data-in-web-storage', merge(
  {
    valid: [
      // Non-credential keys are fine — theme state is not a finding.
      "localStorage.setItem('theme', 'dark')",
      'localStorage.pageCount = 4',
      // Reading back is not a write.
      "const t = localStorage.getItem('authToken')",
      // Key from a variable cannot be judged.
      'sessionStorage.setItem(key, value)',
      // Only *Storage roots match.
      'cache.setItem("authToken", token)',
    ],
    invalid: [
      {
        code: "localStorage.setItem('accessToken', token)",
        errors: [{ messageId: 'credentialInStorage' }],
      },
      {
        code: 'sessionStorage.jwt = token',
        errors: [{ messageId: 'credentialInStorage' }],
      },
      {
        code: "window.localStorage.setItem('refresh_token', refresh)",
        errors: [{ messageId: 'credentialInStorage' }],
      },
      {
        code: "localStorage['apiKey'] = key",
        errors: [{ messageId: 'credentialInStorage' }],
      },
    ],
  },

  {
    valid: [],
    invalid: [],
  },
))
