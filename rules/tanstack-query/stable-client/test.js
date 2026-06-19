const { test } = require('../../../machinery/test')

test('tanstack-query/stable-client', {
  valid: [
    // Module scope — perfectly fine
    `const queryClient = new QueryClient()`,

    // Inside useState — stable
    {
      code: `
        function App() {
          const [queryClient] = useState(() => new QueryClient())
          return null
        }
      `,
    },

    // Inside React.useState — stable
    {
      code: `
        function App() {
          const [queryClient] = React.useState(() => new QueryClient())
          return null
        }
      `,
    },

    // useState with block body
    {
      code: `
        function App() {
          const [queryClient] = useState(() => {
            return new QueryClient()
          })
          return null
        }
      `,
    },

    // Non-component function (lowercase) — not our concern
    {
      code: `
        function createClient() {
          return new QueryClient()
        }
      `,
    },

    // Different constructor — not QueryClient
    {
      code: `
        function App() {
          const client = new SomeOtherClient()
          return null
        }
      `,
    },
  ],
  invalid: [
    // Direct instantiation in component body
    {
      code: `
        function App() {
          const queryClient = new QueryClient()
          return null
        }
      `,
      errors: [{ messageId: 'unstable' }],
    },

    // Arrow component
    {
      code: `
        const App = () => {
          const queryClient = new QueryClient()
          return null
        }
      `,
      errors: [{ messageId: 'unstable' }],
    },

    // PascalCase component with function expression
    {
      code: `
        const MyProvider = function() {
          const queryClient = new QueryClient()
          return null
        }
      `,
      errors: [{ messageId: 'unstable' }],
    },

    // Passed directly as prop — still unstable
    {
      code: `
        function App() {
          return <QueryClientProvider client={new QueryClient()} />
        }
      `,
      errors: [{ messageId: 'unstable' }],
    },
  ],
})
