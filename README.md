# @kaliber/eslint-plugin

This repository contains the configuration for Biome, which enforces Kaliber's code conventions.

## Usage

To use this configuration in your project, create a `biome.json` file with the following content:

```json
{
  "extends": "./node_modules/@kaliber/eslint-plugin/biome.json"
}
```

## Custom Rules

This project includes custom rules that are implemented as Biome plugins. These plugins are located in the `plugins/` directory.

### Supported Rules

*   `kaliber/component-properties`: Enforces conventions for component properties.
*   `kaliber/layout-class-name`: Enforces conventions for `className` and `layoutClassName`.
*   `kaliber/naming-policy`: Enforces naming conventions for components, CSS files, and style variables.
*   `kaliber/no-relative-parent-import`: Prevents imports from parent directories.

## Publishing a new version

To publish a new version, run the following commands:

```sh
>> yarn publish
>> git push
>> git push --tags
```
