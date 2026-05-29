# @kaliber/eslint-plugin

This ESLint plugin enforces Kaliber's code conventions, helping maintain consistency across projects.

## Usage

To use this plugin in your project, create an `eslint.config.js` file with the following content:

```js
const kaliberConfig = require('@kaliber/eslint-plugin/eslint.config')

module.exports = [
  ...kaliberConfig,
  // your project-specific overrides here
]
```


## Publishing a new version

To publish a new version, run the following commands:

```sh
>> yarn publish
>> git push
>> git push --tags
```
