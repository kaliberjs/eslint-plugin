# tanstack-query/stable-client

Prevents creating a `new QueryClient()` inside a React component body, where it would be re-instantiated on every render — destroying the cache and causing subtle bugs.

Inspired by [`@tanstack/query/stable-query-client`](https://tanstack.com/query/v5/docs/eslint/stable-query-client), ported without the dependency.

## Rule details

A `QueryClient` holds the `QueryCache`, so you only want **one instance** for the lifecycle of your application. Creating it inside a component body means a fresh instance on every render, which:

- Wipes the query cache
- Breaks background refetching
- Causes infinite loading states

### ✅ Valid

```js
// Module scope — created once
const queryClient = new QueryClient()

// Wrapped in useState — lazy initializer runs once
function App() {
  const [queryClient] = useState(() => new QueryClient())
  return <QueryClientProvider client={queryClient}>…</QueryClientProvider>
}

// React.useState variant
function App() {
  const [queryClient] = React.useState(() => new QueryClient())
  return <QueryClientProvider client={queryClient}>…</QueryClientProvider>
}
```

### ❌ Invalid

```js
// Re-created every render
function App() {
  const queryClient = new QueryClient()
  return <QueryClientProvider client={queryClient}>…</QueryClientProvider>
}

// Inline prop — same problem
function App() {
  return <QueryClientProvider client={new QueryClient()} />
}
```

## Further reading

- [TanStack Query — Stable Query Client](https://tanstack.com/query/v5/docs/eslint/stable-query-client)
