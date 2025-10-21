# Rules Overview

| Name | Description | Source | Test Location |
|---|---|---|---|
| **Custom Rules** | | | |
| @kaliber/component-properties | Enforces prop destructuring and consistent variable passing for components. | Custom | [rules/component-properties/test.js](rules/component-properties/test.js) |
| @kaliber/jsx-key | Adaptation of the original `react/jsx-key` rule to allow for keyless JSX in array literals, which is common in DSLs. | Custom | [rules/jsx-key/test.js](rules/jsx-key/test.js) |
| @kaliber/layout-class-name | Enforces the use of `layoutClassName` for positioning custom components to maintain a black box approach. | Custom | [rules/layout-class-name/test.js](rules/layout-class-name/test.js) |
| @kaliber/naming-policy | Enforces a consistent naming policy for components, CSS files, variables, and refs to improve readability and enable tooling. | Custom | [rules/naming-policy/test.js](rules/naming-policy/test.js) |
| @kaliber/no-default-export | Prefers named exports over default exports to avoid ambiguity and refactoring issues. | Custom | [rules/no-default-export/test.js](rules/no-default-export/test.js) |
| @kaliber/no-relative-parent-import | Disallows relative parent imports (`../`) in favor of root-slash imports to prevent broken paths when moving files. | Custom | [rules/no-relative-parent-import/test.js](rules/no-relative-parent-import/test.js) |
| **Third-Party Rules** | | | |
| **eslint-plugin-import** | | | |
| import/first | Ensure all imports appear before other statements | [eslint-plugin-import](https://github.com/import-js/eslint-plugin-import) | [tests](https://github.com/import-js/eslint-plugin-import/tree/main/tests) |
| import/no-amd | Forbid AMD `require` and `define` calls. | [eslint-plugin-import](https://github.com/import-js/eslint-plugin-import) | [tests](https://github.com/import-js/eslint-plugin-import/tree/main/tests) |
| import/no-webpack-loader-syntax | Forbid webpack loader syntax in imports. | [eslint-plugin-import](https://github.com/import-js/eslint-plugin-import) | [tests](https://github.com/import-js/eslint-plugin-import/tree/main/tests) |
| import/no-duplicates | Forbid repeated import of the same module in multiple places. | [eslint-plugin-import](https://github.com/import-js/eslint-plugin-import) | [tests](https://github.com/import-js/eslint-plugin-import/tree/main/tests) |
| import/export | Forbid any invalid exports, i.e. re-export of the same name. | [eslint-plugin-import](https://github.com/import-js/eslint-plugin-import) | [tests](https://github.com/import-js/eslint-plugin-import/tree/main/tests) |
| import/default | Ensure a default export is present, given a default import. | [eslint-plugin-import](https://github.com/import-js/eslint-plugin-import) | [tests](https://github.com/import-js/eslint-plugin-import/tree/main/tests) |
| import/no-unresolved | Ensure imports point to a file/module that can be resolved. | [eslint-plugin-import](https://github.com/import-js/eslint-plugin-import) | [tests](https://github.com/import-js/eslint-plugin-import/tree/main/tests) |
| import/named | Ensure named imports correspond to a named export in the remote file. | [eslint-plugin-import](https://github.com/import-js/eslint-plugin-import) | [tests](https://github.com/import-js/eslint-plugin-import/tree/main/tests) |
| **eslint-plugin-jsx-a11y** | | | |
| jsx-a11y/accessible-emoji | Enforce emojis are wrapped in `<span>` and provide screen reader access. | [eslint-plugin-jsx-a11y](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y) | [__tests__](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/tree/main/__tests__) |
| jsx-a11y/alt-text | Enforce all elements that require alternative text have meaningful information to relay back to end user. | [eslint-plugin-jsx-a11y](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y) | [__tests__](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/tree/main/__tests__) |
| jsx-a11y/anchor-has-content | Enforce all anchors to contain accessible content. | [eslint-plugin-jsx-a11y](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y) | [__tests__](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/tree/main/__tests__) |
| jsx-a11y/anchor-is-valid | Enforce all anchors are valid, navigable elements. | [eslint-plugin-jsx-a11y](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y) | [__tests__](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/tree/main/__tests__) |
| jsx-a11y/aria-activedescendant-has-tabindex | Enforce elements with aria-activedescendant are tabbable. | [eslint-plugin-jsx-a11y](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y) | [__tests__](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/tree/main/__tests__) |
| jsx-a11y/aria-props | Enforce all aria-* props are valid. | [eslint-plugin-jsx-a11y](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y) | [__tests__](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/tree/main/__tests__) |
| jsx-a11y/aria-proptypes | Enforce ARIA state and property values are valid. | [eslint-plugin-jsx-a11y](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y) | [__tests__](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/tree/main/__tests__) |
| jsx-a11y/aria-role | Enforce that elements with ARIA roles must use a valid, non-abstract ARIA role. | [eslint-plugin-jsx-a11y](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y) | [__tests__](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/tree/main/__tests__) |
| jsx-a11y/aria-unsupported-elements | Enforce that elements that do not support ARIA roles, states, and properties do not have those attributes. | [eslint-plugin-jsx-a11y](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y) | [__tests__](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/tree/main/__tests__) |
| jsx-a11y/heading-has-content | Enforce heading (h1, h2, etc) elements contain accessible content. | [eslint-plugin-jsx-a11y](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y) | [__tests__](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/tree/main/__tests__) |
| jsx-a11y/html-has-lang | Enforce `<html>` element has lang prop. | [eslint-plugin-jsx-a11y](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y) | [__tests__](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/tree/main/__tests__) |
| jsx-a11y/iframe-has-title | Enforce iframe elements have a title attribute. | [eslint-plugin-jsx-a11y](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y) | [__tests__](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/tree/main/__tests__) |
| jsx-a11y/img-redundant-alt | Enforce `<img>` alt prop does not contain the word "image", "picture", or "photo". | [eslint-plugin-jsx-a11y](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y) | [__tests__](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/tree/main/__tests__) |
| jsx-a11y/no-access-key | Enforce that the accessKey prop is not used on any element to avoid complications with keyboard commands used by a screen reader. | [eslint-plugin-jsx-a11y](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y) | [__tests__](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/tree/main/__tests__) |
| jsx-a11y/no-distracting-elements | Enforce distracting elements are not used. | [eslint-plugin-jsx-a11y](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y) | [__tests__](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/tree/main/__tests__) |
| jsx-a11y/no-redundant-roles | Enforce explicit role property is not the same as implicit/default role property on element. | [eslint-plugin-jsx-a11y](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y) | [__tests__](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/tree/main/__tests__) |
| jsx-a11y/role-has-required-aria-props | Enforce that elements with ARIA roles must have all required attributes for that role. | [eslint-plugin-jsx-a11y](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y) | [__tests__](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/tree/main/__tests__) |
| jsx-a11y/role-supports-aria-props | Enforce that elements with explicit or implicit roles defined contain only aria-* properties supported by that role. | [eslint-plugin-jsx-a11y](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y) | [__tests__](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/tree/main/__tests__) |
| jsx-a11y/scope | Enforce scope prop is only used on `<th>` elements. | [eslint-plugin-jsx-a11y](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y) | [__tests__](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/tree/main/__tests__) |
| **eslint-plugin-react** | | | |
| react/jsx-boolean-value | Enforce boolean attributes notation in JSX | [eslint-plugin-react](https://github.com/jsx-eslint/eslint-plugin-react) | [tests](https://github.com/jsx-eslint/eslint-plugin-react/tree/main/tests) |
| react/jsx-curly-spacing | Enforce or disallow spaces inside of curly braces in JSX attributes and expressions | [eslint-plugin-react](https://github.com/jsx-eslint/eslint-plugin-react) | [tests](https://github.com/jsx-eslint/eslint-plugin-react/tree/main/tests) |
| react/jsx-equals-spacing | Enforce or disallow spaces around equal signs in JSX attributes | [eslint-plugin-react](https://github.com/jsx-eslint/eslint-plugin-react) | [tests](https://github.com/jsx-eslint/eslint-plugin-react/tree/main/tests) |
| react/jsx-indent | Enforce JSX indentation | [eslint-plugin-react](https://github.com/jsx-eslint/eslint-plugin-react) | [tests](https://github.com/jsx-eslint/eslint-plugin-react/tree/main/tests) |
| react/jsx-indent-props | Enforce props indentation in JSX | [eslint-plugin-react](https://github.com/jsx-eslint/eslint-plugin-react) | [tests](https://github.com/jsx-eslint/eslint-plugin-react/tree/main/tests) |
| react/jsx-no-comment-textnodes | Disallow comments from being inserted as text nodes | [eslint-plugin-react](https://github.com/jsx-eslint/eslint-plugin-react) | [tests](https://github.com/jsx-eslint/eslint-plugin-react/tree/main/tests) |
| react/jsx-no-duplicate-props | Disallow duplicate properties in JSX | [eslint-plugin-react](https://github.com/jsx-eslint/eslint-plugin-react) | [tests](https://github.com/jsx-eslint/eslint-plugin-react/tree/main/tests) |
| react/jsx-no-target-blank | Disallow `target="_blank"` attribute without `rel="noreferrer"` | [eslint-plugin-react](https://github.com/jsx-eslint/eslint-plugin-react) | [tests](https://github.com/jsx-eslint/eslint-plugin-react/tree/main/tests) |
| react/jsx-no-undef | Disallow undeclared variables in JSX | [eslint-plugin-react](https://github.com/jsx-eslint/eslint-plugin-react) | [tests](https://github.com/jsx-eslint/eslint-plugin-react/tree/main/tests) |
| react/jsx-pascal-case | Enforce PascalCase for user-defined JSX components | [eslint-plugin-react](https://github.com/jsx-eslint/eslint-plugin-react) | [tests](https://github.com/jsx-eslint/eslint-plugin-react/tree/main/tests) |
| react/jsx-tag-spacing | Enforce whitespace in and around the JSX opening and closing brackets | [eslint-plugin-react](https://github.com/jsx-eslint/eslint-plugin-react) | [tests](https://github.com/jsx-eslint/eslint-plugin-react/tree/main/tests) |
| react/jsx-uses-vars | Disallow variables used in JSX to be incorrectly marked as unused | [eslint-plugin-react](https://github.com/jsx-eslint/eslint-plugin-react) | [tests](https://github.com/jsx-eslint/eslint-plugin-react/tree/main/tests) |
| react/jsx-wrap-multilines | Disallow missing parentheses around multiline JSX | [eslint-plugin-react](https://github.com/jsx-eslint/eslint-plugin-react) | [tests](https://github.com/jsx-eslint/eslint-plugin-react/tree/main/tests) |
| react/no-danger-with-children | Disallow when a DOM element is using both children and dangerouslySetInnerHTML | [eslint-plugin-react](https://github.com/jsx-eslint/eslint-plugin-react) | [tests](https://github.com/jsx-eslint/eslint-plugin-react/tree/main/tests) |
| react/no-deprecated | Disallow usage of deprecated methods | [eslint-plugin-react](https://github.com/jsx-eslint/eslint-plugin-react) | [tests](https://github.com/jsx-eslint/eslint-plugin-react/tree/main/tests) |
| react/no-direct-mutation-state | Disallow direct mutation of this.state | [eslint-plugin-react](https://github.com/jsx-eslint/eslint-plugin-react) | [tests](https://github.com/jsx-eslint/eslint-plugin-react/tree/main/tests) |
| react/no-unused-prop-types | Disallow definitions of unused propTypes | [eslint-plugin-react](https://github.com/jsx-eslint/eslint-plugin-react) | [tests](https://github.com/jsx-eslint/eslint-plugin-react/tree/main/tests) |
| react/prop-types | Disallow missing props validation in a React component definition | [eslint-plugin-react](https://github.com/jsx-eslint/eslint-plugin-react) | [tests](https://github.com/jsx-eslint/eslint-plugin-react/tree/main/tests) |
| react/require-render-return | Enforce ES5 or ES6 class for returning value in render function | [eslint-plugin-react](https://github.com/jsx-eslint/eslint-plugin-react) | [tests](https://github.com/jsx-eslint/eslint-plugin-react/tree/main/tests) |
| react/self-closing-comp | Disallow extra closing tags for components without children | [eslint-plugin-react](https://github.com/jsx-eslint/eslint-plugin-react) | [tests](https://github.com/jsx-eslint/eslint-plugin-react/tree/main/tests) |
| react/void-dom-elements-no-children | Disallow void DOM elements (e.g. `<img />`, `<br />`) from receiving children | [eslint-plugin-react](https://github.com/jsx-eslint/eslint-plugin-react) | [tests](https://github.com/jsx-eslint/eslint-plugin-react/tree/main/tests) |
| **eslint-plugin-react-hooks** | | | |
| react-hooks/rules-of-hooks | Enforces the Rules of Hooks. | [eslint-plugin-react-hooks](https://react.dev/reference/eslint-plugin-react-hooks) | N/A |
| react-hooks/exhaustive-deps | Verifies that all dependencies are correctly specified in the dependency array of hooks like `useEffect` and `useCallback`. | [eslint-plugin-react-hooks](https://react.dev/reference/eslint-plugin-react-hooks) | N/A |
| **ESLint Core Rules** | | | |
| brace-style | enforce consistent brace style for blocks | [ESLint](https://eslint.org/docs/rules/) | [tests](https://github.com/eslint/eslint/tree/main/tests) |
| indent | enforce consistent indentation | [ESLint](https://eslint.org/docs/rules/) | [tests](https://github.com/eslint/eslint/tree/main/tests) |
| accessor-pairs | enforce getter and setter pairs in objects | [ESLint](https://eslint.org/docs/rules/) | [tests](https://github.com/eslint/eslint/tree/main/tests) |
| array-callback-return | enforce `return` statements in callbacks of array methods | [ESLint](https://eslint.org/docs/rules/) | [tests](https://github.com/eslint/eslint/tree/main/tests) |
| arrow-spacing | enforce consistent spacing before and after the arrow in arrow functions | [ESLint](https://eslint.org/docs/rules/) | [tests](https://github.com/eslint/eslint/tree/main/tests) |
| block-spacing | enforce consistent spacing inside single-line blocks | [ESLint](https://eslint.org/docs/rules/) | [tests](https://github.com/eslint/eslint/tree/main/tests) |
| comma-dangle | require or disallow trailing commas | [ESLint](https://eslint.org/docs/rules/) | [tests](https://github.com/eslint/eslint/tree/main/tests) |
| comma-spacing | enforce consistent spacing before and after commas | [ESLint](https://eslint.org/docs/rules/) | [tests](https://github.com/eslint/eslint/tree/main/tests) |
| comma-style | enforce consistent comma style | [ESLint](https://eslint.org/docs/rules/) | [tests](https://github.com/eslint/eslint/tree/main/tests) |
| default-case | require `default` cases in `switch` statements | [ESLint](https://eslint.org/docs/rules/) | [tests](https://github.com/eslint/eslint/tree/main/tests) |
| dot-location | enforce consistent newlines before and after dots | [ESLint](https://eslint.org/docs/rules/) | [tests](https://github.com/eslint/eslint/tree/main/tests) |
| eol-last | require or disallow newline at the end of files | [ESLint](https://eslint.org/docs/rules/) | [tests](https://github.com/eslint/eslint/tree/main/tests) |
| eqeqeq | require the use of `===` and `!==` | [ESLint](https://eslint.org/docs/rules/) | [tests](https://github.com/eslint/eslint/tree/main/tests) |
| key-spacing | enforce consistent spacing between keys and values in object literal properties | [ESLint](https://eslint.org/docs/rules/) | [tests](https://github.com/eslint/eslint/tree/main/tests) |
| keyword-spacing | enforce consistent spacing before and after keywords | [ESLint](https://eslint.org/docs/rules/) | [tests](https://github.com/eslint/eslint/tree/main/tests) |
| new-parens | require parentheses when invoking a constructor with no arguments | [ESLint](https://eslint.org/docs/rules/) | [tests](https://github.com/eslint/eslint/tree/main/tests) |
| no-array-constructor | disallow `Array` constructors | [ESLint](https://eslint.org/docs/rules/) | [tests](https://github.com/eslint/eslint/tree/main/tests) |
| no-caller | disallow the use of `arguments.caller` or `arguments.callee` | [ESLint](https://eslint.org/docs/rules/) | [tests](https://github.com/eslint/eslint/tree/main/tests) |
| no-class-assign | disallow reassigning class members | [ESLint](https://eslint.org/docs/rules/) | [tests](https://github.com/eslint/eslint/tree/main/tests) |
| no-compare-neg-zero | disallow comparing against -0 | [ESLint](https://eslint.org/docs/rules/) | [tests](https://github.com/eslint/eslint/tree/main/tests) |
| no-cond-assign | disallow assignment operators in conditional expressions | [ESLint](https://eslint.org/docs/rules/) | [tests](https://github.com/eslint/eslint/tree/main/tests) |
| no-const-assign | disallow reassigning `const` variables | [ESLint](https://eslint.org/docs/rules/) | [tests](https://github.com/eslint/eslint/tree/main/tests) |
| no-constant-condition | disallow constant expressions in conditions | [ESLint](https://eslint.org/docs/rules/) | [tests](https://github.com/eslint/eslint/tree/main/tests) |
| no-control-regex | disallow control characters in regular expressions | [ESLint](https://eslint.org/docs/rules/) | [tests](https://github.com/eslint/eslint/tree/main/tests) |
| no-debugger | disallow the use of `debugger` | [ESLint](https://eslint.org/docs/rules/) | [tests](https://github.com/eslint/eslint/tree/main/tests) |
| no-delete-var | disallow deleting variables | [ESLint](https://eslint.org/docs/rules/) | [tests](https://github.com/eslint/eslint/tree/main/tests) |
| no-dupe-args | disallow duplicate arguments in `function` definitions | [ESLint](https://eslint.org/docs/rules/) | [tests](https://github.com/eslint/eslint/tree/main/tests) |
| no-dupe-class-members | disallow duplicate class members | [ESLint](https://eslint.org/docs/rules/) | [tests](https://github.com/eslint/eslint/tree/main/tests) |
| no-dupe-keys | disallow duplicate keys in object literals | [ESLint](https://eslint.org/docs/rules/) | [tests](https://github.com/eslint/eslint/tree/main/tests) |
| no-duplicate-case | disallow duplicate case labels | [ESLint](https://eslint.org/docs/rules/) | [tests](https://github.com/eslint/eslint/tree/main/tests) |
| no-empty-character-class | disallow empty character classes in regular expressions | [ESLint](https://eslint.org/docs/rules/) | [tests](https://github.com/eslint/eslint/tree/main/tests) |
| no-empty-pattern | disallow empty destructuring patterns | [ESLint](https://eslint.org/docs/rules/) | [tests](https://github.com/eslint/eslint/tree/main/tests) |
| no-eval | disallow the use of `eval()` | [ESLint](https://eslint.org/docs/rules/) | [tests](https://github.com/eslint/eslint/tree/main/tests) |
| no-ex-assign | disallow reassigning exceptions in `catch` clauses | [ESLint](https://eslint.org/docs/rules/) | [tests](https://github.com/eslint/eslint/tree/main/tests) |
| no-extend-native | disallow extending native types | [ESLint](https://eslint.org/docs/rules/) | [tests](https://github.com/eslint/eslint/tree/main/tests) |
| no-extra-bind | disallow unnecessary calls to `.bind()` | [ESLint](https://eslint.org/docs/rules/) | [tests](https://github.com/eslint/eslint/tree/main/tests) |
| no-extra-boolean-cast | disallow unnecessary boolean casts | [ESLint](https://eslint.org/docs/rules/) | [tests](https://github.com/eslint/eslint/tree/main/tests) |
| no-extra-label | disallow unnecessary labels | [ESLint](https://eslint.org/docs/rules/) | [tests](https://github.com/eslint/eslint/tree/main/tests) |
| no-extra-parens | disallow unnecessary parentheses | [ESLint](https://eslint.org/docs/rules/) | [tests](https://github.com/eslint/eslint/tree/main/tests) |
| no-fallthrough | disallow fallthrough of `case` statements | [ESLint](https://eslint.org/docs/rules/) | [tests](https://github.com/eslint/eslint/tree/main/tests) |
| no-floating-decimal | disallow leading or trailing decimal points in numeric literals | [ESLint](https://eslint.org/docs/rules/) | [tests](https://github.com/eslint/eslint/tree/main/tests) |
| no-func-assign | disallow reassigning `function` declarations | [ESLint](https://eslint.org/docs/rules/) | [tests](https://github.com/eslint/eslint/tree/main/tests) |
| no-global-assign | disallow assignments to native objects or read-only global variables | [ESLint](https://eslint.org/docs/rules/) | [tests](https://github.com/eslint/eslint/tree/main/tests) |
| no-implied-eval | disallow the use of `eval()`-like methods | [ESLint](https://eslint.org/docs/rules/) | [tests](https://github.com/eslint/eslint/tree/main/tests) |
| no-invalid-regexp | disallow invalid regular expression strings in `RegExp` constructors | [ESLint](https://eslint.org/docs/rules/) | [tests](https://github.com/eslint/eslint/tree/main/tests) |
| no-irregular-whitespace | disallow irregular whitespace outside of strings and comments | [ESLint](https://eslint.org/docs/rules/) | [tests](https://github.com/eslint/eslint/tree/main/tests) |
| no-iterator | disallow the use of the `__iterator__` property | [ESLint](https://eslint.org/docs/rules/) | [tests](https://github.com/eslint/eslint/tree/main/tests) |
| no-label-var | disallow labels that share a name with a variable | [ESLint](https://eslint.org/docs/rules/) | [tests](https://github.com/eslint/eslint/tree/main/tests) |
| no-labels | disallow labeled statements | [ESLint](https://eslint.org/docs/rules/) | [tests](https://github.com/eslint/eslint/tree/main/tests) |
| no-lone-blocks | disallow unnecessary nested blocks | [ESLint](https://eslint.org/docs/rules/) | [tests](https://github.com/eslint/eslint/tree/main/tests) |
| no-loop-func | disallow `function` declarations and expressions inside loop statements | [ESLint](https://eslint.org/docs/rules/) | [tests](https://github.com/eslint/eslint/tree/main/tests) |
| no-mixed-spaces-and-tabs | disallow mixed spaces and tabs for indentation | [ESLint](https://eslint.org/docs/rules/) | [tests](https://github.com/eslint/eslint/tree/main/tests) |
| no-path-concat | disallow string concatenation with `__dirname` and `__filename` | [ESLint](https://eslint.org/docs/rules/) | [tests](https://github.com/eslint/eslint/tree/main/tests) |
| no-proto | disallow the use of the `__proto__` property | [ESLint](https://eslint.org/docs/rules/) | [tests](https://github.com/eslint/eslint/tree/main/tests) |
| no-return-assign | disallow assignment operators in `return` statements | [ESLint](https://eslint.org/docs/rules/) | [tests](https://github.com/eslint/eslint/tree/main/tests) |
| no-return-await | disallow unnecessary `return await` | [ESLint](https://eslint.org/docs/rules/) | [tests](https://github.com/eslint/eslint/tree/main/tests) |
| no-trailing-spaces | disallow trailing whitespace at the end of lines | [ESLint](https://eslint.org/docs/rules/) | [tests](https://github.com/eslint/eslint/tree/main/tests) |
| no-unneeded-ternary | disallow ternary operators when simpler alternatives exist | [ESLint](https://eslint.org/docs/rules/) | [tests](https://github.com/eslint/eslint/tree/main/tests) |
| no-unsafe-negation | disallow negating the left operand of relational operators | [ESLint](https://eslint.org/docs/rules/) | [tests](https://github.com/eslint/eslint/tree/main/tests) |
| no-useless-return | disallow redundant return statements | [ESLint](https://eslint.org/docs/rules/) | [tests](https://github.com/eslint/eslint/tree/main/tests) |
| object-curly-spacing | enforce consistent spacing inside braces | [ESLint](https://eslint.org/docs/rules/) | [tests](https://github.com/eslint/eslint/tree/main/tests) |
| object-shorthand | require or disallow method and property shorthand syntax for object literals | [ESLint](https://eslint.org/docs/rules/) | [tests](https://github.com/eslint/eslint/tree/main/tests) |
| quotes | enforce the consistent use of either backticks, double, or single quotes | [ESLint](https://eslint.org/docs/rules/) | [tests](https://github.com/eslint/eslint/tree/main/tests) |
| semi | require or disallow semicolons instead of ASI | [ESLint](https://eslint.org/docs/rules/) | [tests](https://github.com/eslint/eslint/tree/main/tests) |
| semi-spacing | enforce consistent spacing before and after semicolons | [ESLint](https://eslint.org/docs/rules/) | [tests](https://github.com/eslint/eslint/tree/main/tests) |
| space-before-blocks | enforce consistent spacing before blocks | [ESLint](https://eslint.org/docs/rules/) | [tests](https://github.com/eslint/eslint/tree/main/tests) |
| space-before-function-paren | enforce consistent spacing before `function` definition opening parenthesis | [ESLint](https://eslint.org/docs/rules/) | [tests](https://github.com/eslint/eslint/tree/main/tests) |
| space-infix-ops | require spacing around infix operators | [ESLint](https://eslint.org/docs/rules/) | [tests](https://github.com/eslint/eslint/tree/main/tests) |
| space-unary-ops | enforce consistent spacing before or after unary operators | [ESLint](https://eslint.org/docs/rules/) | [tests](https://github.com/eslint/eslint/tree/main/tests) |
| template-tag-spacing | require or disallow spacing between template tags and their literals | [ESLint](https://eslint.org/docs/rules/) | [tests](https://github.com/eslint/eslint/tree/main/tests) |
| no-mixed-operators | disallow mixed binary operators | [ESLint](https://eslint.org/docs/rules/) | [tests](https://github.com/eslint/eslint/tree/main/tests) |
| no-multi-str | disallow multiline strings | [ESLint](https://eslint.org/docs/rules/) | [tests](https://github.com/eslint/eslint/tree/main/tests) |
| no-native-reassign | disallow assignments to native objects or read-only global variables | [ESLint](https://eslint.org/docs/rules/) | [tests](https://github.com/eslint/eslint/tree/main/tests) |
| no-negated-in-lhs | disallow negating the left operand of relational operators | [ESLint](https://eslint.org/docs/rules/) | [tests](https://github.com/eslint/eslint/tree/main/tests) |
| no-new-func | disallow `new` operators with the `Function` object | [ESLint](https://eslint.org/docs/rules/) | [tests](https://github.com/eslint/eslint/tree/main/tests) |
| no-new-object | disallow `Object` constructors | [ESLint](https://eslint.org/docs/rules/) | [tests](https://github.com/eslint/eslint/tree/main/tests) |
| no-new-symbol | disallow `new` operators with the `Symbol` object | [ESLint](https://eslint.org/docs/rules/) | [tests](https://github.com/eslint/eslint/tree/main/tests) |
| no-new-wrappers | disallow `new` operators with the `String`, `Number`, and `Boolean` objects | [ESLint](https://eslint.org/docs/rules/) | [tests](https://github.com/eslint/eslint/tree/main/tests) |
| no-obj-calls | disallow calling global object properties as functions | [ESLint](https://eslint.org/docs/rules/) | [tests](https://github.com/eslint/eslint/tree/main/tests) |
| no-octal | disallow octal literals | [ESLint](https://eslint.org/docs/rules/) | [tests](https://github.com/eslint/eslint/tree/main/tests) |
| no-octal-escape | disallow octal escape sequences in string literals | [ESLint](https://eslint.org/docs/rules/) | [tests](https://github.com/eslint/eslint/tree/main/tests) |
| no-redeclare | disallow variable redeclaration | [ESLint](https://eslint.org/docs/rules/) | [tests](https://github.com/eslint/eslint/tree/main/tests) |
| no-regex-spaces | disallow multiple spaces in regular expressions | [ESLint](https://eslint.org/docs/rules/) | [tests](https://github.com/eslint/eslint/tree/main/tests) |
| no-restricted-globals | disallow specified global variables | [ESLint](https://eslint.org/docs/rules/) | [tests](https://github.com/eslint/eslint/tree/main/tests) |
| no-restricted-properties | disallow certain properties on certain objects | [ESLint](https://eslint.org/docs/rules/) | [tests](https://github.com/eslint/eslint/tree/main/tests) |
| no-restricted-syntax | disallow specified syntax | [ESLint](https://eslint.org/docs/rules/) | [tests](https://github.com/eslint/eslint/tree/main/tests) |
| no-script-url | disallow `javascript:` urls | [ESLint](https://eslint.org/docs/rules/) | [tests](https://github.com/eslint/eslint/tree/main/tests) |
| no-self-assign | disallow assignments where both sides are exactly the same | [ESLint](https://eslint.org/docs/rules/) | [tests](https://github.com/eslint/eslint/tree/main/tests) |
| no-self-compare | disallow comparisons where both sides are exactly the same | [ESLint](https://eslint.org/docs/rules/) | [tests](https://github.com/eslint/eslint/tree/main/tests) |
| no-shadow-restricted-names | disallow identifiers from shadowing restricted names | [ESLint](https://eslint.org/docs/rules/) | [tests](https://github.com/eslint/eslint/tree/main/tests) |
| no-sparse-arrays | disallow sparse arrays | [ESLint](https://eslint.org/docs/rules/) | [tests](https://github.com/eslint/eslint/tree/main/tests) |
| no-template-curly-in-string | disallow template literal placeholder syntax in regular strings | [ESLint](https://eslint.org/docs/rules/) | [tests](https://github.com/eslint/eslint/tree/main/tests) |
| no-this-before-super | disallow `this`/`super` before calling `super()` in constructors | [ESLint](https://eslint.org/docs/rules/) | [tests](https://github.com/eslint/eslint/tree/main/tests) |
| no-throw-literal | disallow throwing literals as exceptions | [ESLint](https://eslint.org/docs/rules/) | [tests](https://github.com/eslint/eslint/tree/main/tests) |
| no-undef | disallow the use of undeclared variables unless mentioned in `/*global */` comments | [ESLint](https://eslint.org/docs/rules/) | [tests](https://github.com/eslint/eslint/tree/main/tests) |
| no-unexpected-multiline | disallow confusing multiline expressions | [ESLint](https://eslint.org/docs/rules/) | [tests](https://github.com/eslint/eslint/tree/main/tests) |
| no-unreachable | disallow unreachable code after `return`, `throw`, `continue`, and `break` statements | [ESLint](https://eslint.org/docs/rules/) | [tests](https://github.com/eslint/eslint/tree/main/tests) |
| no-unused-expressions | disallow unused expressions | [ESLint](https://eslint.org/docs/rules/) | [tests](https://github.com/eslint/eslint/tree/main/tests) |
| no-unused-labels | disallow unused labels | [ESLint](https://eslint.org/docs/rules/) | [tests](https://github.com/eslint/eslint/tree/main/tests) |
| no-unused-vars | disallow unused variables | [ESLint](https://eslint.org/docs/rules/) | [tests](https://github.com/eslint/eslint/tree/main/tests) |
| no-use-before-define | disallow the use of variables before they are defined | [ESLint](https://eslint.org/docs/rules/) | [tests](https://github.com/eslint/eslint/tree/main/tests) |
| no-useless-computed-key | disallow unnecessary computed property keys in object literals | [ESLint](https://eslint.org/docs/rules/) | [tests](https://github.com/eslint/eslint/tree/main/tests) |
| no-useless-concat | disallow unnecessary concatenation of literals or template literals | [ESLint](https://eslint.org/docs/rules/) | [tests](https://github.com/eslint/eslint/tree/main/tests) |
| no-useless-constructor | disallow unnecessary constructors | [ESLint](https://eslint.org/docs/rules/) | [tests](https://github.com/eslint/eslint/tree/main/tests) |
| no-useless-escape | disallow unnecessary escape characters | [ESLint](https://eslint.org/docs/rules/) | [tests](https://github.com/eslint/eslint/tree/main/tests) |
| no-whitespace-before-property | disallow whitespace before properties | [ESLint](https://eslint.org/docs/rules/) | [tests](https://github.com/eslint/eslint/tree/main/tests) |
| no-with | disallow `with` statements | [ESLint](https://eslint.org/docs/rules/) | [tests](https://github.com/eslint/eslint/tree/main/tests) |
| radix | enforce the consistent use of the radix argument when using `parseInt()` | [ESLint](https://eslint.org/docs/rules/) | [tests](https://github.com/eslint/eslint/tree/main/tests) |
| require-yield | require generator functions to contain `yield` | [ESLint](https://eslint.org/docs/rules/) | [tests](https://github.com/eslint/eslint/tree/main/tests) |
| rest-spread-spacing | enforce spacing between rest and spread operators and their expressions | [ESLint](https://eslint.org/docs/rules/) | [tests](https://github.com/eslint/eslint/tree/main/tests) |
| strict | require or disallow strict mode directives | [ESLint](https://eslint.org/docs/rules/) | [tests](https://github.com/eslint/eslint/tree/main/tests) |
| unicode-bom | require or disallow Unicode byte order mark (BOM) | [ESLint](https://eslint.org/docs/rules/) | [tests](https://github.com/eslint/eslint/tree/main/tests) |
| use-isnan | require calls to `isNaN()` when checking for `NaN` | [ESLint](https://eslint.org/docs/rules/) | [tests](https://github.com/eslint/eslint/tree/main/tests) |
| valid-typeof | enforce comparing `typeof` expressions against valid strings | [ESLint](https://eslint.org/docs/rules/) | [tests](https://github.com/eslint/eslint/tree/main/tests) |
