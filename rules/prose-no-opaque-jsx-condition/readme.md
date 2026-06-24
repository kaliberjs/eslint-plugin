# Prose: no opaque JSX condition

JSX render conditions should read as intent. If a condition in
`{condition && <Component />}` or `{condition ? <A /> : <B />}` requires
decoding compound logic, nested property chains, or inline comparisons,
extract it into a named predicate.

## Correct

```jsx
{isReady && <Panel />}
{user.active && <Panel />}
{isReady(user) && <Panel />}
{!isLoading && <Content />}
{value != null && <Display />}
{isReady ? <Panel /> : <Fallback />}
```

## Incorrect

```jsx
{user.active && !user.suspended && <Panel />}
{user.profile.settings && <Panel />}
{status === 'active' && <Badge />}
{!user.profile.active && <Warning />}
{user.active && user.verified ? <Panel /> : null}
```

## When Not To Use It

If your team prefers inline JSX conditions regardless of complexity, or if you
have a different convention for managing render logic.
