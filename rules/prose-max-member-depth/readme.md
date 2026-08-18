# Prose: max member depth

Deep member access chains like `config.server.salary.filter.range` are feature
envy — your code is reaching deep into another module's data structure. This
makes the code fragile and hard to follow.

Destructure at the boundary or extract a named intermediate.

## Correct

```js
const { range } = salaryFilter
const enabled = salaryFilter.enabledInCountries

const { defaultLanguage } = config.multiLanguage
```

## Incorrect

```js
const range = config.server.salary.filter.range
const enabled = data.clientConfig.salary.filter.enabledInCountries
const lang = config?.client?.multiLanguage?.defaultLanguage?.code
```

## Real-world example

In rabobank-jobs, `config.server.salary.filter.range` appeared 4× across a
module. Each access is depth 4 — the code knows too much about the config shape.

After:

```js
const { range } = getSalaryFilterConfig(config)
```

One access point, one place to update when the shape changes.

## Options

```js
{
  max: 3
}
```

`max` defaults to `3`. A chain of `a.b.c.d` (depth 4) would be reported. Raise
the limit if a project has deeply nested config by design. Lower it to `2` for
stricter enforcement.

## When not to use it

If your codebase frequently accesses deeply nested external API responses and
restructuring is not practical, disable this rule for those files.
