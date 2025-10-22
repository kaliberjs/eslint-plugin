# @kaliber/eslint-plugin

This ESLint plugin enforces Kaliber's code conventions, helping maintain consistency across projects.


## Usage (for `oxlint` experiment)
```bash
yarn link "@kaliber/eslint-plugin"
yarn install --force
```

```json
{ 
  scripts: {
    "lint.javascript:oxlint": "oxlint -c node_modules/@kaliber/eslint-plugin/.oxlintrc.json --ignore-path .gitignore ."
  }
}
```

## Usage

To use this plugin in your project, create an `.eslintrc` file with the following content:

```json
{
  "extends": "./node_modules/@kaliber/eslint-plugin/.eslintrc"
}
```

## Publishing a new version

To publish a new version, run the following commands:

```sh
>> yarn publish
>> git push
>> git push --tags
```
